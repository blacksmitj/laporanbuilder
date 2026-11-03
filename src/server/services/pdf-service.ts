import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  officials,
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
        sortOrder: reportParticipants.sortOrder,
        visitDate: reportParticipants.visitDate,
        rulesNarrative: reportParticipants.rulesNarrative,
        narrative: reportParticipants.narrative,
        normalizedData: participants.normalizedData,
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

  const participantsList = selectedParticipants.map((p) => {
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
    };
  });

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
