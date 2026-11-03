import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  officials,
  participants,
  reportContents,
  reportFiles,
  reportOfficials,
  reportParticipants,
  reportSnapshots,
  reports,
  reportTemplates,
  reportTemplateVersions,
} from "@/lib/db/schema";
import { generatePdfBufferFromSnapshot } from "@/lib/pdf/generator";
import type { ReportDocumentSnapshot } from "@/lib/pdf/render-html";
import { renderReportDocumentHtml } from "@/lib/pdf/render-html";
import { putStorageObject, storageKeys } from "@/lib/storage";
import {
  buildLpdBusinessAddress,
  buildLpdBusinessDescription,
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
): Promise<ReportDocumentSnapshot> {
  const report = await assertReportAccess(reportId, actor);
  const definition = getReportType(report.reportType);

  const [
    assignedOfficials,
    contents,
    selectedParticipants,
    activeTemplateVersion,
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
    // Resolve Template Version (PRD §9)
    report.templateVersionId
      ? db
          .select()
          .from(reportTemplateVersions)
          .where(eq(reportTemplateVersions.id, report.templateVersionId))
          .limit(1)
      : db
          .select({
            version: reportTemplateVersions.version,
            configuration: reportTemplateVersions.configuration,
          })
          .from(reportTemplateVersions)
          .innerJoin(
            reportTemplates,
            eq(reportTemplateVersions.templateId, reportTemplates.id),
          )
          .where(eq(reportTemplates.reportType, report.reportType))
          .orderBy(desc(reportTemplateVersions.version))
          .limit(1),
  ]);

  const templateConfig =
    (activeTemplateVersion[0]?.configuration as unknown as TemplateConfiguration) ||
    definition?.defaultTemplate;

  if (!templateConfig) {
    throw new HttpError(400, "Konfigurasi template laporan belum tersedia.");
  }

  const sectionsMap: Record<string, unknown> = {};
  for (const c of contents) {
    sectionsMap[c.sectionKey] = c.content;
  }

  const participantsList = selectedParticipants.map((p) => {
    const norm = (p.normalizedData || {}) as Partial<LpdMonevTkmNormalizedRow>;
    return {
      sortOrder: p.sortOrder,
      respondentName: String(norm.respondentName || "-"),
      tkmId: norm.tkmId ? String(norm.tkmId) : null,
      visitDate:
        p.visitDate ||
        (typeof norm.interviewDate === "string" ? norm.interviewDate : null),
      businessAddress: buildLpdBusinessAddress(norm),
      businessDescription: buildLpdBusinessDescription(norm),
      sector: typeof norm.sector === "string" ? norm.sector : null,
      businessType:
        typeof norm.businessType === "string" ? norm.businessType : null,
      mainProduct:
        typeof norm.mainProduct === "string" ? norm.mainProduct : null,
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

export async function getReportHtmlPreview(reportId: string, actor: Actor) {
  const snapshot = await buildReportSnapshotPayload(reportId, actor);
  return renderReportDocumentHtml(snapshot);
}

export async function generateReportPdf(reportId: string, actor: Actor) {
  const report = await assertReportAccess(reportId, actor);
  const snapshotPayload = await buildReportSnapshotPayload(reportId, actor);

  // Determine next snapshot version
  const latestSnapshots = await db
    .select({ version: reportSnapshots.version })
    .from(reportSnapshots)
    .where(eq(reportSnapshots.reportId, reportId))
    .orderBy(desc(reportSnapshots.version))
    .limit(1);

  const nextVersion = (latestSnapshots[0]?.version ?? 0) + 1;

  // Generate PDF synchronously via Playwright
  const pdfBuffer = await generatePdfBufferFromSnapshot(snapshotPayload);
  const storageKey = storageKeys.reportPdfVersion(reportId, nextVersion);

  await putStorageObject({
    key: storageKey,
    body: pdfBuffer,
    contentType: "application/pdf",
  });

  const filename = `${report.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_v${nextVersion}.pdf`;

  const result = await db.transaction(async (tx) => {
    // 1. Save Immutable Snapshot
    const [snapshotRow] = await tx
      .insert(reportSnapshots)
      .values({
        reportId,
        version: nextVersion,
        definitionVersion: report.definitionVersion,
        payload: snapshotPayload as unknown as Record<string, unknown>,
        createdBy: actor.id,
      })
      .returning();

    // 2. Save Report File Record
    const [fileRow] = await tx
      .insert(reportFiles)
      .values({
        reportId,
        snapshotId: snapshotRow.id,
        storageKey,
        filename,
        fileSize: pdfBuffer.length,
        status: "ready",
      })
      .returning();

    // 3. Update Report Status to Generated
    await tx
      .update(reports)
      .set({
        status: "generated",
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    return {
      snapshot: snapshotRow,
      file: fileRow,
    };
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "pdf.generated",
    metadata: {
      version: nextVersion,
      filename,
      fileSize: pdfBuffer.length,
    },
  });

  return result;
}

export async function listReportPdfFiles(reportId: string, actor: Actor) {
  await assertReportAccess(reportId, actor);

  return db
    .select()
    .from(reportFiles)
    .where(eq(reportFiles.reportId, reportId))
    .orderBy(desc(reportFiles.generatedAt));
}

