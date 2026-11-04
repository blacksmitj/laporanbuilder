import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getStorageObjectBuffer } from "@/lib/storage";
import {
  officials,
  participantDocuments,
  participants,
  reportContents,
  reportOfficials,
  reportParticipants,
  reports,
  reportTemplates,
} from "@/lib/db/schema";
import { generatePdfBufferFromSnapshot } from "@/lib/pdf/generator";
import type { ReportDocumentSnapshot } from "@/lib/pdf/render-html";
import { renderReportDocumentHtml } from "@/lib/pdf/render-html";
import {
  buildLpdBusinessAddress,
  buildLpdBusinessDescription,
  buildLpdMonitoringRegionIntro,
} from "@/report-types/lpd-monev-tkm/narrative-rules";
import type { LpdMonevTkmNormalizedRow } from "@/report-types/lpd-monev-tkm/row-schema";
import { getReportType } from "@/report-types/registry";
import type { TemplateConfiguration } from "@/report-types/types";
import {
  type Actor,
  assertReportAccess,
  HttpError,
} from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export async function buildReportSnapshotPayload(
  reportId: string,
  actor: Actor,
  overrideTemplateId?: string | null,
  overrideTemplateConfig?: TemplateConfiguration | null,
): Promise<ReportDocumentSnapshot> {
  const report = await assertReportAccess(reportId, actor);
  const definition = getReportType(report.reportType);

  const effectiveTemplateId =
    overrideTemplateId !== undefined
      ? overrideTemplateId
      : report.templateId;

  const [
    assignedOfficials,
    contents,
    selectedParticipants,
    activeTemplate,
  ] = await Promise.all([
    db
      .select({
        name: officials.name,
        nip: officials.nip,
        position: officials.position,
        institution: officials.institution,
        sortOrder: reportOfficials.sortOrder,
        signingEnabled: reportOfficials.signingEnabled,
      })
      .from(reportOfficials)
      .innerJoin(officials, eq(reportOfficials.officialId, officials.id))
      .where(eq(reportOfficials.reportId, reportId))
      .orderBy(asc(reportOfficials.sortOrder)),
    db
      .select()
      .from(reportContents)
      .where(eq(reportContents.reportId, reportId)),
    db
      .select({
        participantId: reportParticipants.participantId,
        sortOrder: reportParticipants.sortOrder,
        visitDate: reportParticipants.visitDate,
        rulesNarrative: reportParticipants.rulesNarrative,
        narrative: reportParticipants.narrative,
        normalizedData: participants.normalizedData,
        rawData: participants.rawData,
      })
      .from(reportParticipants)
      .innerJoin(
        participants,
        eq(reportParticipants.participantId, participants.id),
      )
      .where(eq(reportParticipants.reportId, reportId))
      .orderBy(asc(reportParticipants.sortOrder)),
    // Resolve Template Configuration
    overrideTemplateConfig
      ? Promise.resolve([])
      : effectiveTemplateId
        ? db
            .select()
            .from(reportTemplates)
            .where(eq(reportTemplates.id, effectiveTemplateId))
            .limit(1)
        : db
            .select()
            .from(reportTemplates)
            .where(eq(reportTemplates.reportType, report.reportType))
            .limit(1),
  ]);

  const templateConfig =
    overrideTemplateConfig ||
    (activeTemplate[0]?.configuration as unknown as TemplateConfiguration) ||
    definition?.defaultTemplate;

  if (!templateConfig) {
    throw new HttpError(400, "Konfigurasi template laporan belum tersedia.");
  }

  const sectionsMap: Record<string, unknown> = {};
  for (const c of contents) {
    sectionsMap[c.sectionKey] = c.content;
  }

  // Ensure default sections if not present
  if (definition?.sections) {
    for (const sec of definition.sections) {
      if (!sectionsMap[sec.key] && sec.defaultContent) {
        sectionsMap[sec.key] = { ...sec.defaultContent };
      }
    }
  }

  // Check and populate monitoring region intro for Section B
  const sectionB = sectionsMap.section_b_summary as
    | {
        monitoringRegionIntro?: string;
        introText?: string;
        showParticipantTable?: boolean;
      }
    | undefined;

  if (
    sectionB &&
    (!sectionB.monitoringRegionIntro ||
      sectionB.monitoringRegionIntro.trim() === "")
  ) {
    const participantRows = selectedParticipants.map(
      (p) => (p.normalizedData || {}) as LpdMonevTkmNormalizedRow,
    );
    const generatedIntro = buildLpdMonitoringRegionIntro(participantRows);
    if (generatedIntro) {
      sectionsMap.section_b_summary = {
        ...sectionB,
        monitoringRegionIntro: generatedIntro,
      };
    }
  }

  const fetchRemoteParticipantImage = async (urlValue: unknown) => {
    if (typeof urlValue !== "string" || !urlValue.trim()) {
      return null;
    }

    try {
      const parsed = new URL(urlValue.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { unavailable: true as const };
      }

      let fileId: string | null = null;
      if (
        parsed.hostname === "drive.google.com" ||
        parsed.hostname === "drive.usercontent.google.com" ||
        parsed.hostname.endsWith(".googleusercontent.com")
      ) {
        fileId =
          parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ??
          parsed.searchParams.get("id") ??
          null;
      }

      const candidateUrls: string[] = [];
      if (fileId && /^[a-zA-Z0-9_-]+$/.test(fileId)) {
        candidateUrls.push(`https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1600`);
        candidateUrls.push(`https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1600`);
        candidateUrls.push(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`);
      } else {
        return { unavailable: true as const };
      }

      for (const targetUrl of candidateUrls) {
        try {
          const response = await fetch(targetUrl, {
            signal: AbortSignal.timeout(8000),
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
          });
          if (!response.ok) continue;

          const mimeType = (response.headers.get("content-type") ?? "")
            .split(";")[0]
            .trim()
            .toLowerCase();
          if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
            continue;
          }

          const contentLength = Number(response.headers.get("content-length") ?? 0);
          if (contentLength > 10 * 1024 * 1024) {
            continue;
          }

          const bytes = Buffer.from(await response.arrayBuffer());
          if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
            continue;
          }

          return {
            dataUrl: `data:${mimeType};base64,${bytes.toString("base64")}`,
          };
        } catch {
          continue;
        }
      }

      return { unavailable: true as const };
    } catch {
      return { unavailable: true as const };
    }
  };

  const photoForUrl = async (url: unknown, label: string) => {
    if (typeof url !== "string" || !url.trim()) return [];
    return [
      {
        label,
        filename: label,
        ...(await fetchRemoteParticipantImage(url)),
      },
    ];
  };

  const selectedParticipantIds = selectedParticipants.map((p) => p.participantId);
  const participantPhotoRows = selectedParticipantIds.length
    ? await db
        .select({
          participantId: participantDocuments.participantId,
          filename: participantDocuments.originalFilename,
          storageKey: participantDocuments.storageKey,
          mimeType: participantDocuments.mimeType,
          createdAt: participantDocuments.createdAt,
        })
        .from(participantDocuments)
        .where(inArray(participantDocuments.participantId, selectedParticipantIds))
        .orderBy(asc(participantDocuments.createdAt), asc(participantDocuments.id))
    : [];

  const photosByParticipant = new Map<
    string,
    Array<{ dataUrl: string; filename: string }>
  >();
  const loadedPhotos = await Promise.all(
    participantPhotoRows
      .filter((photo) => ["image/jpeg", "image/png", "image/webp"].includes(photo.mimeType))
      .map(async (photo) => {
        try {
          const buffer = await getStorageObjectBuffer(photo.storageKey);
          return {
            participantId: photo.participantId,
            photo: {
              dataUrl: `data:${photo.mimeType};base64,${buffer.toString("base64")}`,
              filename: photo.filename,
            },
          };
        } catch (error) {
          console.warn("[pdf] Foto peserta tidak dapat dimuat:", photo.storageKey, error);
          return null;
        }
      }),
  );
  for (const loaded of loadedPhotos) {
    if (!loaded) continue;
    const photos = photosByParticipant.get(loaded.participantId) ?? [];
    photos.push(loaded.photo);
    photosByParticipant.set(loaded.participantId, photos);
  }

  const participantsList = await Promise.all(selectedParticipants.map(async (p) => {
    const norm = (p.normalizedData || {}) as Partial<LpdMonevTkmNormalizedRow>;
    const businessDesc =
      buildLpdBusinessDescription(norm) ||
      norm.businessType ||
      norm.sector ||
      "";
    const address = buildLpdBusinessAddress(norm) || "";

    return {
      sortOrder: p.sortOrder,
      respondentName: norm.respondentName || "-",
      tkmId: norm.tkmId || null,
      visitDate: p.visitDate
        ? new Date(p.visitDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : null,
      businessAddress: address,
      businessDescription: businessDesc,
      sector: norm.sector || null,
      businessType: norm.businessType || null,
      mainProduct: norm.mainProduct || null,
      narrative: p.narrative || p.rulesNarrative || "",
      photos: [
        ...(await photoForUrl(
          norm.docBusinessPlaceUrl ?? p.rawData.docBusinessPlaceUrl,
          "Foto Tempat Usaha",
        )),
        ...(await photoForUrl(
          norm.docActivityUrl ?? p.rawData.docActivityUrl,
          "Foto Kegiatan",
        )),
        ...(photosByParticipant.get(p.participantId) ?? []),
      ],
    };
  }));

  return {
    reportId: report.id,
    name: report.name,
    reportType: report.reportType,
    fiscalYear: report.fiscalYear,
    metadata: report.metadata as ReportDocumentSnapshot["metadata"],
    template: templateConfig,
    officials: assignedOfficials,
    sections: sectionsMap,
    participants: participantsList,
  };
}

export async function getReportPreviewHtml(
  reportId: string,
  actor: Actor,
  overrideTemplateId?: string | null,
  overrideTemplateConfig?: TemplateConfiguration | null,
) {
  const snapshot = await buildReportSnapshotPayload(
    reportId,
    actor,
    overrideTemplateId,
    overrideTemplateConfig,
  );
  return renderReportDocumentHtml(snapshot);
}

export const getReportHtmlPreview = getReportPreviewHtml;

export async function generateReportPdf(
  reportId: string,
  actor: Actor,
  overrideTemplateId?: string | null,
  overrideTemplateConfig?: TemplateConfiguration | null,
): Promise<{ buffer: Buffer; filename: string }> {
  const report = await assertReportAccess(reportId, actor);
  const snapshotPayload = await buildReportSnapshotPayload(
    reportId,
    actor,
    overrideTemplateId,
    overrideTemplateConfig,
  );

  // Generate PDF synchronously via Playwright
  const pdfBuffer = await generatePdfBufferFromSnapshot(snapshotPayload);
  const sanitizedName = report.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${sanitizedName}.pdf`;

  // Update Report Status to Generated
  await db
    .update(reports)
    .set({
      status: "generated",
      updatedAt: new Date(),
    })
    .where(eq(reports.id, reportId));

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "pdf.generated",
    metadata: {
      filename,
      fileSize: pdfBuffer.length,
    },
  });

  return {
    buffer: pdfBuffer,
    filename,
  };
}
