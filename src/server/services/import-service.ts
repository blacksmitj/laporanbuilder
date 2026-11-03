import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  importBatches,
  participants,
  reportParticipants,
  reports,
} from "@/lib/db/schema";
import {
  type ExcelParseSummary,
  type ParsedExcelRow,
  parseExcelBuffer,
  revalidateNormalizedRow,
} from "@/lib/excel/parser";
import { putStorageObject, storageKeys } from "@/lib/storage";
import type { ConfirmImportInput } from "@/lib/validations/import-schema";
import { getReportType } from "@/report-types/registry";
import {
  type Actor,
  assertReportAccess,
  HttpError,
} from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".tsv"];
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function uploadAndParseExcel(params: {
  reportId: string;
  file: File;
  actor: Actor;
}) {
  const { reportId, file, actor } = params;
  const report = await assertReportAccess(reportId, actor);

  if (!file || file.size === 0) {
    throw new HttpError(400, "File Excel tidak boleh kosong.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new HttpError(
      400,
      "Ukuran file terlalu besar. Maksimal 25 MB.",
    );
  }

  const ext = path.extname(file.name).toLowerCase() || ".xlsx";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new HttpError(
      400,
      "Format file tidak didukung. Gunakan file .xlsx atau .xls.",
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const definition = getReportType(report.reportType);
  let parseSummary: ExcelParseSummary;

  try {
    parseSummary = await parseExcelBuffer(buffer, {
      rowSchema: definition?.rowSchema,
      filename: file.name,
    });
  } catch (error) {
    throw new HttpError(
      400,
      error instanceof Error
        ? error.message
        : "Gagal membaca file Excel yang diunggah.",
    );
  }

  const batchId = crypto.randomUUID();
  const storageKey = storageKeys.reportSourceExcel(report.id, batchId, ext);

  await putStorageObject({
    key: storageKey,
    body: buffer,
    contentType:
      file.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const [createdBatch] = await db
    .insert(importBatches)
    .values({
      id: batchId,
      reportId: report.id,
      originalFilename: file.name,
      storageKey,
      status: "parsed",
      isActive: false,
      totalRows: parseSummary.totalRowsRead,
      successfulRows: parseSummary.validRowsCount,
      failedRows: parseSummary.invalidRowsCount,
      validationSummary:
        parseSummary as unknown as Record<string, unknown>,
    })
    .returning();

  await recordAuditLog({
    userId: actor.id,
    reportId: report.id,
    action: "import.uploaded",
    metadata: {
      batchId: createdBatch.id,
      filename: file.name,
      totalRows: parseSummary.totalRowsRead,
      validRows: parseSummary.validRowsCount,
      invalidRows: parseSummary.invalidRowsCount,
    },
  });

  return {
    batch: createdBatch,
    preview: parseSummary,
  };
}

export async function listReportImportBatches(reportId: string, actor: Actor) {
  await assertReportAccess(reportId, actor);

  const batches = await db
    .select({
      id: importBatches.id,
      reportId: importBatches.reportId,
      originalFilename: importBatches.originalFilename,
      status: importBatches.status,
      isActive: importBatches.isActive,
      totalRows: importBatches.totalRows,
      successfulRows: importBatches.successfulRows,
      failedRows: importBatches.failedRows,
      importedAt: importBatches.importedAt,
    })
    .from(importBatches)
    .where(eq(importBatches.reportId, reportId))
    .orderBy(desc(importBatches.importedAt));

  return batches;
}

export async function getImportBatchPreview(
  reportId: string,
  batchId: string,
  actor: Actor,
) {
  await assertReportAccess(reportId, actor);

  const [batch] = await db
    .select()
    .from(importBatches)
    .where(
      and(
        eq(importBatches.id, batchId),
        eq(importBatches.reportId, reportId),
      ),
    )
    .limit(1);

  if (!batch) {
    throw new HttpError(404, "Batch import tidak ditemukan.");
  }

  return {
    batch: {
      id: batch.id,
      reportId: batch.reportId,
      originalFilename: batch.originalFilename,
      status: batch.status,
      isActive: batch.isActive,
      totalRows: batch.totalRows,
      successfulRows: batch.successfulRows,
      failedRows: batch.failedRows,
      importedAt: batch.importedAt,
    },
    preview: batch.validationSummary as unknown as ExcelParseSummary,
  };
}

export async function confirmImportBatch(params: {
  reportId: string;
  batchId: string;
  input: ConfirmImportInput;
  actor: Actor;
}) {
  const { reportId, batchId, input, actor } = params;
  const report = await assertReportAccess(reportId, actor);

  const [batch] = await db
    .select()
    .from(importBatches)
    .where(
      and(
        eq(importBatches.id, batchId),
        eq(importBatches.reportId, reportId),
      ),
    )
    .limit(1);

  if (!batch) {
    throw new HttpError(404, "Batch import tidak ditemukan.");
  }

  if (batch.status === "confirmed") {
    throw new HttpError(400, "Batch import ini sudah dikonfirmasi sebelumnya.");
  }

  const definition = getReportType(report.reportType);
  const summary = batch.validationSummary as unknown as ExcelParseSummary;

  if (!summary || !Array.isArray(summary.rows) || summary.rows.length === 0) {
    throw new HttpError(
      400,
      "Tidak ada baris data yang dapat dikonfirmasi pada batch ini.",
    );
  }

  const overridesMap = new Map<number, Record<string, unknown>>();
  for (const item of input.rowOverrides ?? []) {
    overridesMap.set(item.rowNumber, item.overrides);
  }

  const revalidatedRows: ParsedExcelRow[] = summary.rows.map((row) => {
    const rowOverride = overridesMap.get(row.rowNumber);
    if (!rowOverride) {
      return revalidateNormalizedRow(
        row.rowNumber,
        row.rawData,
        row.normalizedData,
        definition?.rowSchema,
        [],
        row.warnings,
      );
    }

    const mergedNormalized = {
      ...row.normalizedData,
      ...rowOverride,
    };

    return revalidateNormalizedRow(
      row.rowNumber,
      row.rawData,
      mergedNormalized,
      definition?.rowSchema,
      [],
      row.warnings,
    );
  });

  const rowsToInsert = input.includeInvalidRows
    ? revalidatedRows
    : revalidatedRows.filter((r) => r.isValid);

  if (rowsToInsert.length === 0) {
    throw new HttpError(
      400,
      "Tidak ada baris valid untuk disimpan. Perbaiki data pada tabel preview terlebih dahulu.",
    );
  }

  const validCount = revalidatedRows.filter((r) => r.isValid).length;
  const invalidCount = revalidatedRows.length - validCount;

  const updatedSummary: ExcelParseSummary = {
    ...summary,
    validRowsCount: validCount,
    invalidRowsCount: invalidCount,
    rows: revalidatedRows,
  };

  const result = await db.transaction(async (tx) => {
    // 1. Mark previous active batches on this report as superseded
    await tx
      .update(importBatches)
      .set({ isActive: false, status: "superseded" })
      .where(
        and(
          eq(importBatches.reportId, reportId),
          eq(importBatches.isActive, true),
        ),
      );

    // 2. Replace existing isolated dataset for this report
    await tx
      .delete(reportParticipants)
      .where(eq(reportParticipants.reportId, reportId));
    await tx
      .delete(participants)
      .where(eq(participants.reportId, reportId));

    // 3. Insert participants from confirmed batch
    const insertedParticipants = await tx
      .insert(participants)
      .values(
        rowsToInsert.map((row) => ({
          reportId,
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          rawData: row.rawData,
          normalizedData: row.normalizedData,
        })),
      )
      .returning();

    // 4. Auto-select participants into report_participants if enabled
    if (input.autoSelectParticipants && insertedParticipants.length > 0) {
      await tx.insert(reportParticipants).values(
        insertedParticipants.map((p, index) => ({
          reportId,
          participantId: p.id,
          sortOrder: index,
          visitDate:
            typeof p.normalizedData.interviewDate === "string"
              ? p.normalizedData.interviewDate
              : null,
        })),
      );
    }

    // 5. Mark current batch as confirmed & active
    const [confirmedBatch] = await tx
      .update(importBatches)
      .set({
        status: "confirmed",
        isActive: true,
        successfulRows: validCount,
        failedRows: invalidCount,
        validationSummary:
          updatedSummary as unknown as Record<string, unknown>,
      })
      .where(eq(importBatches.id, batch.id))
      .returning();

    // 6. Touch report updatedAt
    await tx
      .update(reports)
      .set({ updatedAt: new Date() })
      .where(eq(reports.id, reportId));

    return {
      batch: confirmedBatch,
      insertedCount: insertedParticipants.length,
    };
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "import.confirmed",
    metadata: {
      batchId: batch.id,
      filename: batch.originalFilename,
      insertedParticipants: result.insertedCount,
    },
  });

  return result;
}

