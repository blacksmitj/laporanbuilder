import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ExcelImportView,
  type ImportBatchMeta,
} from "@/components/imports/excel-import-view";
import { db } from "@/lib/db";
import { importBatches } from "@/lib/db/schema";
import type { ExcelParseSummary } from "@/lib/excel/parser";
import { HttpError, requireUser } from "@/server/permissions";
import { getReportDetail } from "@/server/services/report-service";

export default async function ReportImportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, latestBatches] = await Promise.all([
      getReportDetail(reportId, actor),
      db
        .select()
        .from(importBatches)
        .where(eq(importBatches.reportId, reportId))
        .orderBy(desc(importBatches.importedAt))
        .limit(1),
    ]);

    const latestBatch = latestBatches[0] ?? null;

    const initialBatch: ImportBatchMeta | null = latestBatch
      ? {
          id: latestBatch.id,
          reportId: latestBatch.reportId,
          originalFilename: latestBatch.originalFilename,
          status: latestBatch.status,
          isActive: latestBatch.isActive,
          totalRows: latestBatch.totalRows,
          successfulRows: latestBatch.successfulRows,
          failedRows: latestBatch.failedRows,
          importedAt: latestBatch.importedAt,
        }
      : null;

    const initialPreview =
      (latestBatch?.validationSummary as unknown as ExcelParseSummary) ?? null;

    return (
      <ExcelImportView
        reportId={report.id}
        reportName={report.name}
        participantCount={report.participantCount}
        selectedParticipantCount={report.selectedParticipantCount}
        pdfCount={report.files.length}
        initialBatch={initialBatch}
        initialPreview={initialPreview}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
