import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  importBatches,
  officials,
  participants,
  reportContents,
  reportFiles,
  reportOfficials,
  reportParticipants,
  type ReportStatus,
  reports,
  users,
} from "@/lib/db/schema";
import type {
  CreateReportInput,
  UpdateReportInput,
} from "@/lib/validations/report-schema";
import { getReportType } from "@/report-types/registry";
import {
  type Actor,
  assertReportAccess,
  buildReportScopeWhere,
  HttpError,
} from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export interface ListReportsFilters {
  search?: string;
  reportType?: string;
  status?: ReportStatus;
  fiscalYear?: number;
}

export interface ReportSummaryItem {
  id: string;
  name: string;
  reportType: string;
  definitionVersion: number;
  fiscalYear: number;
  status: ReportStatus;
  metadata: Record<string, unknown>;
  version: number;
  createdBy: string;
  creatorName: string;
  creatorEmail: string;
  participantCount: number;
  officialCount: number;
  pdfCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listReports(
  actor: Actor,
  filters?: ListReportsFilters,
): Promise<ReportSummaryItem[]> {
  const conditions = [buildReportScopeWhere(actor)];

  if (filters?.reportType && filters.reportType !== "all") {
    conditions.push(eq(reports.reportType, filters.reportType));
  }
  if (filters?.status) {
    conditions.push(eq(reports.status, filters.status));
  }
  if (filters?.fiscalYear) {
    conditions.push(eq(reports.fiscalYear, filters.fiscalYear));
  }
  if (filters?.search && filters.search.trim().length > 0) {
    conditions.push(ilike(reports.name, `%${filters.search.trim()}%`));
  }

  const rows = await db
    .select({
      report: reports,
      creatorName: users.name,
      creatorEmail: users.email,
    })
    .from(reports)
    .innerJoin(users, eq(reports.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(reports.updatedAt));

  if (rows.length === 0) {
    return [];
  }

  const reportIds = rows.map((r) => r.report.id);

  const [participantCounts, officialCounts, pdfCounts] = await Promise.all([
    db
      .select({
        reportId: participants.reportId,
        total: count(),
      })
      .from(participants)
      .where(inArray(participants.reportId, reportIds))
      .groupBy(participants.reportId),
    db
      .select({
        reportId: reportOfficials.reportId,
        total: count(),
      })
      .from(reportOfficials)
      .where(inArray(reportOfficials.reportId, reportIds))
      .groupBy(reportOfficials.reportId),
    db
      .select({
        reportId: reportFiles.reportId,
        total: count(),
      })
      .from(reportFiles)
      .where(inArray(reportFiles.reportId, reportIds))
      .groupBy(reportFiles.reportId),
  ]);

  const participantMap = new Map(
    participantCounts.map((c) => [c.reportId, c.total]),
  );
  const officialMap = new Map(
    officialCounts.map((c) => [c.reportId, c.total]),
  );
  const pdfMap = new Map(pdfCounts.map((c) => [c.reportId, c.total]));

  return rows.map(({ report, creatorName, creatorEmail }) => ({
    id: report.id,
    name: report.name,
    reportType: report.reportType,
    definitionVersion: report.definitionVersion,
    fiscalYear: report.fiscalYear,
    status: report.status,
    metadata: report.metadata,
    version: report.version,
    createdBy: report.createdBy,
    creatorName,
    creatorEmail,
    participantCount: participantMap.get(report.id) ?? 0,
    officialCount: officialMap.get(report.id) ?? 0,
    pdfCount: pdfMap.get(report.id) ?? 0,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  }));
}

export async function getReportDetail(reportId: string, actor: Actor) {
  const report = await assertReportAccess(reportId, actor);

  const [
    creatorRows,
    assignedOfficials,
    sectionsContent,
    activeBatchRows,
    participantCountRows,
    selectedParticipantCountRows,
    latestPdfRows,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, report.createdBy))
      .limit(1),
    db
      .select({
        id: reportOfficials.id,
        officialId: officials.id,
        name: officials.name,
        nip: officials.nip,
        position: officials.position,
        institution: officials.institution,
        sortOrder: reportOfficials.sortOrder,
        signingEnabled: reportOfficials.signingEnabled,
      })
      .from(reportOfficials)
      .innerJoin(officials, eq(reportOfficials.officialId, officials.id))
      .where(eq(reportOfficials.reportId, report.id))
      .orderBy(asc(reportOfficials.sortOrder)),
    db
      .select()
      .from(reportContents)
      .where(eq(reportContents.reportId, report.id)),
    db
      .select()
      .from(importBatches)
      .where(
        and(
          eq(importBatches.reportId, report.id),
          eq(importBatches.isActive, true),
        ),
      )
      .orderBy(desc(importBatches.importedAt))
      .limit(1),
    db
      .select({ total: count() })
      .from(participants)
      .where(eq(participants.reportId, report.id)),
    db
      .select({ total: count() })
      .from(reportParticipants)
      .where(eq(reportParticipants.reportId, report.id)),
    db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.reportId, report.id))
      .orderBy(desc(reportFiles.generatedAt)),
  ]);

  return {
    ...report,
    creator: creatorRows[0] ?? null,
    officials: assignedOfficials,
    sections: sectionsContent,
    activeImportBatch: activeBatchRows[0] ?? null,
    participantCount: participantCountRows[0]?.total ?? 0,
    selectedParticipantCount: selectedParticipantCountRows[0]?.total ?? 0,
    files: latestPdfRows,
  };
}

export async function createReport(input: CreateReportInput, actor: Actor) {
  const definition = getReportType(input.reportType);
  if (!definition) {
    throw new HttpError(400, "Jenis laporan tidak terdaftar.");
  }

  const parsedMetadata = definition.metadataSchema.safeParse(input.metadata);
  if (!parsedMetadata.success) {
    const firstIssue = parsedMetadata.error.issues[0];
    throw new HttpError(
      400,
      firstIssue?.message ?? "Metadata laporan tidak valid.",
    );
  }

  const created = await db.transaction(async (tx) => {
    const [reportRow] = await tx
      .insert(reports)
      .values({
        name: input.name,
        reportType: definition.key,
        definitionVersion: definition.version,
        fiscalYear: input.fiscalYear,
        status: "draft",
        metadata: parsedMetadata.data as Record<string, unknown>,
        createdBy: actor.id,
      })
      .returning();

    if (input.officials && input.officials.length > 0) {
      const uniqueOfficialIds = new Set<string>();
      const officialRows = input.officials
        .filter((item) => {
          if (uniqueOfficialIds.has(item.officialId)) return false;
          uniqueOfficialIds.add(item.officialId);
          return true;
        })
        .map((item, idx) => ({
          reportId: reportRow.id,
          officialId: item.officialId,
          sortOrder: item.sortOrder ?? idx,
          signingEnabled: item.signingEnabled ?? true,
        }));

      if (officialRows.length > 0) {
        await tx.insert(reportOfficials).values(officialRows);
      }
    }

    if (definition.sections.length > 0) {
      await tx.insert(reportContents).values(
        definition.sections.map((section) => ({
          reportId: reportRow.id,
          sectionKey: section.key,
          content: section.defaultContent ?? {},
          version: 1,
        })),
      );
    }

    return reportRow;
  });

  await recordAuditLog({
    userId: actor.id,
    reportId: created.id,
    action: "report.created",
    metadata: {
      name: created.name,
      reportType: created.reportType,
      fiscalYear: created.fiscalYear,
    },
  });

  return created;
}

export async function updateReport(
  reportId: string,
  input: UpdateReportInput,
  actor: Actor,
) {
  const existing = await assertReportAccess(reportId, actor);

  if (
    input.expectedVersion !== undefined &&
    input.expectedVersion !== existing.version
  ) {
    throw new HttpError(
      409,
      "Laporan telah diperbarui di sesi lain. Muat ulang halaman sebelum menyimpan.",
    );
  }

  const definition = getReportType(existing.reportType);
  let validatedMetadata = existing.metadata;

  if (input.metadata !== undefined) {
    if (definition) {
      const parsedMeta = definition.metadataSchema.safeParse({
        ...existing.metadata,
        ...input.metadata,
      });
      if (!parsedMeta.success) {
        throw new HttpError(
          400,
          parsedMeta.error.issues[0]?.message ??
            "Metadata laporan tidak valid.",
        );
      }
      validatedMetadata = parsedMeta.data as Record<string, unknown>;
    } else {
      validatedMetadata = {
        ...existing.metadata,
        ...input.metadata,
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(reports)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.fiscalYear !== undefined
          ? { fiscalYear: input.fiscalYear }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.metadata !== undefined
          ? { metadata: validatedMetadata }
          : {}),
        version: sql`${reports.version} + 1`,
      })
      .where(eq(reports.id, reportId));

    if (input.officials !== undefined) {
      await tx
        .delete(reportOfficials)
        .where(eq(reportOfficials.reportId, reportId));

      const uniqueOfficialIds = new Set<string>();
      const officialRows = input.officials
        .filter((item) => {
          if (uniqueOfficialIds.has(item.officialId)) return false;
          uniqueOfficialIds.add(item.officialId);
          return true;
        })
        .map((item, idx) => ({
          reportId,
          officialId: item.officialId,
          sortOrder: item.sortOrder ?? idx,
          signingEnabled: item.signingEnabled ?? true,
        }));

      if (officialRows.length > 0) {
        await tx.insert(reportOfficials).values(officialRows);
      }
    }
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "report.updated",
    metadata: {
      changes: {
        name: input.name,
        fiscalYear: input.fiscalYear,
        status: input.status,
        metadataUpdated: input.metadata !== undefined,
        officialsUpdated: input.officials !== undefined,
      },
    },
  });

  return getReportDetail(reportId, actor);
}

export async function deleteReport(reportId: string, actor: Actor) {
  const existing = await assertReportAccess(reportId, actor);

  const [pdfCountResult] = await db
    .select({ total: count() })
    .from(reportFiles)
    .where(eq(reportFiles.reportId, reportId));

  const hasFinalDocument =
    existing.status !== "draft" || (pdfCountResult?.total ?? 0) > 0;

  if (hasFinalDocument) {
    // PRD §18.3 rule 9: soft delete for reports that already have final documents
    await db
      .update(reports)
      .set({ deletedAt: new Date() })
      .where(eq(reports.id, reportId));
  } else {
    await db.delete(reports).where(eq(reports.id, reportId));
  }

  await recordAuditLog({
    userId: actor.id,
    reportId: hasFinalDocument ? reportId : null,
    action: hasFinalDocument ? "report.soft_deleted" : "report.deleted",
    metadata: {
      deletedReportId: reportId,
      name: existing.name,
      status: existing.status,
    },
  });
}

