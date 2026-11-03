import path from "node:path";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  participantDocuments,
  type ParticipantDocumentType,
  participants,
  reportParticipants,
  reports,
} from "@/lib/db/schema";
import { putStorageObject, storageKeys } from "@/lib/storage";
import type {
  ReorderReportParticipantsInput,
  UpdateParticipantDataInput,
  UpdateReportParticipantsSelectionInput,
} from "@/lib/validations/participant-schema";
import { getReportType } from "@/report-types/registry";
import {
  type Actor,
  assertReportAccess,
  HttpError,
} from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export interface ParticipantListItem {
  id: string;
  reportId: string;
  importBatchId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  isSelected: boolean;
  sortOrder: number | null;
  visitDate: string | null;
  narrative: string | null;
  documentCount: number;
}

export interface ListParticipantsOptions {
  search?: string;
  team?: string;
  regency?: string;
  selectedOnly?: boolean;
}

export async function listParticipants(
  reportId: string,
  actor: Actor,
  options?: ListParticipantsOptions,
): Promise<{
  participants: ParticipantListItem[];
  availableTeams: string[];
  availableRegencies: string[];
  totalCount: number;
  selectedCount: number;
}> {
  await assertReportAccess(reportId, actor);

  const [allParticipants, selectedList, documents] = await Promise.all([
    db
      .select()
      .from(participants)
      .where(eq(participants.reportId, reportId))
      .orderBy(asc(participants.rowNumber)),
    db
      .select()
      .from(reportParticipants)
      .where(eq(reportParticipants.reportId, reportId))
      .orderBy(asc(reportParticipants.sortOrder)),
    db
      .select({
        participantId: participantDocuments.participantId,
      })
      .from(participantDocuments),
  ]);

  const selectedMap = new Map<
    string,
    { sortOrder: number; visitDate: string | null; narrative: string | null }
  >();
  for (const item of selectedList) {
    selectedMap.set(item.participantId, {
      sortOrder: item.sortOrder,
      visitDate: item.visitDate,
      narrative: item.narrative,
    });
  }

  const docCountMap = new Map<string, number>();
  for (const doc of documents) {
    docCountMap.set(
      doc.participantId,
      (docCountMap.get(doc.participantId) ?? 0) + 1,
    );
  }

  const teamSet = new Set<string>();
  const regencySet = new Set<string>();

  for (const p of allParticipants) {
    const norm = p.normalizedData as Record<string, unknown>;
    if (typeof norm.team === "string" && norm.team.trim()) {
      teamSet.add(norm.team.trim());
    }
    if (typeof norm.interviewRegency === "string" && norm.interviewRegency.trim()) {
      regencySet.add(norm.interviewRegency.trim());
    }
  }

  let filtered = allParticipants;

  if (options?.team && options.team !== "all") {
    filtered = filtered.filter((p) => {
      const norm = p.normalizedData as Record<string, unknown>;
      return norm.team === options.team;
    });
  }

  if (options?.regency && options.regency !== "all") {
    filtered = filtered.filter((p) => {
      const norm = p.normalizedData as Record<string, unknown>;
      return norm.interviewRegency === options.regency;
    });
  }

  if (options?.search && options.search.trim()) {
    const term = options.search.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const norm = p.normalizedData as Record<string, unknown>;
      const name = String(norm.respondentName ?? "").toLowerCase();
      const nik = String(norm.nik ?? "").toLowerCase();
      const tkmId = String(norm.tkmId ?? "").toLowerCase();
      const product = String(norm.mainProduct ?? "").toLowerCase();
      return (
        name.includes(term) ||
        nik.includes(term) ||
        tkmId.includes(term) ||
        product.includes(term)
      );
    });
  }

  if (options?.selectedOnly) {
    filtered = filtered.filter((p) => selectedMap.has(p.id));
  }

  const items: ParticipantListItem[] = filtered.map((p) => {
    const sel = selectedMap.get(p.id);
    return {
      id: p.id,
      reportId: p.reportId,
      importBatchId: p.importBatchId,
      rowNumber: p.rowNumber,
      rawData: p.rawData,
      normalizedData: p.normalizedData,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isSelected: Boolean(sel),
      sortOrder: sel ? sel.sortOrder : null,
      visitDate: sel ? sel.visitDate : null,
      narrative: sel ? sel.narrative : null,
      documentCount: docCountMap.get(p.id) ?? 0,
    };
  });

  // Urutkan: Peserta terpilih diurutkan berdasarkan sortOrder mereka,
  // sedangkan yang belum terpilih mengikuti rowNumber aslinya.
  items.sort((a, b) => {
    if (a.isSelected && b.isSelected) {
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    if (a.isSelected) return -1;
    if (b.isSelected) return 1;
    return a.rowNumber - b.rowNumber;
  });

  return {
    participants: items,
    availableTeams: Array.from(teamSet).sort(),
    availableRegencies: Array.from(regencySet).sort(),
    totalCount: allParticipants.length,
    selectedCount: selectedList.length,
  };
}

export async function getParticipantDetail(
  reportId: string,
  participantId: string,
  actor: Actor,
) {
  await assertReportAccess(reportId, actor);

  const [participant] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.reportId, reportId),
      ),
    )
    .limit(1);

  if (!participant) {
    throw new HttpError(404, "Peserta tidak ditemukan.");
  }

  const [selection, docs] = await Promise.all([
    db
      .select()
      .from(reportParticipants)
      .where(
        and(
          eq(reportParticipants.reportId, reportId),
          eq(reportParticipants.participantId, participantId),
        ),
      )
      .limit(1),
    db
      .select()
      .from(participantDocuments)
      .where(eq(participantDocuments.participantId, participantId)),
  ]);

  return {
    ...participant,
    selection: selection[0] ?? null,
    documents: docs,
  };
}

export async function updateParticipantData(
  reportId: string,
  participantId: string,
  input: UpdateParticipantDataInput,
  actor: Actor,
) {
  const report = await assertReportAccess(reportId, actor);

  const [existing] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.reportId, reportId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "Peserta tidak ditemukan.");
  }

  const definition = getReportType(report.reportType);
  let validatedData = input.normalizedData;

  if (definition?.rowSchema) {
    const parsed = definition.rowSchema.safeParse(input.normalizedData);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data peserta tidak valid.",
      );
    }
    validatedData = parsed.data as Record<string, unknown>;
  }

  const [updated] = await db
    .update(participants)
    .set({
      normalizedData: validatedData,
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId))
    .returning();

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "participant.updated",
    metadata: {
      participantId,
      respondentName: validatedData.respondentName,
    },
  });

  return updated;
}

export async function deleteParticipant(
  reportId: string,
  participantId: string,
  actor: Actor,
) {
  await assertReportAccess(reportId, actor);

  const [existing] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.reportId, reportId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "Peserta tidak ditemukan.");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(reportParticipants)
      .where(
        and(
          eq(reportParticipants.reportId, reportId),
          eq(reportParticipants.participantId, participantId),
        ),
      );
    await tx
      .delete(participants)
      .where(eq(participants.id, participantId));
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "participant.deleted",
    metadata: {
      participantId,
    },
  });
}

export async function updateReportParticipantsSelection(
  reportId: string,
  input: UpdateReportParticipantsSelectionInput,
  actor: Actor,
) {
  await assertReportAccess(reportId, actor);

  const targetIds = input.selectedParticipantIds;

  await db.transaction(async (tx) => {
    // Preserve existing narrative & metadata before replacing records
    const existingRows = await tx
      .select({
        participantId: reportParticipants.participantId,
        rulesNarrative: reportParticipants.rulesNarrative,
        aiNarrative: reportParticipants.aiNarrative,
        narrative: reportParticipants.narrative,
        aiMetadata: reportParticipants.aiMetadata,
        visitDate: reportParticipants.visitDate,
      })
      .from(reportParticipants)
      .where(eq(reportParticipants.reportId, reportId));

    const existingMap = new Map(
      existingRows.map((row) => [row.participantId, row]),
    );

    await tx
      .delete(reportParticipants)
      .where(eq(reportParticipants.reportId, reportId));

    if (targetIds.length > 0) {
      const validParticipants = await tx
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.reportId, reportId),
            inArray(participants.id, targetIds),
          ),
        );

      const partMap = new Map(validParticipants.map((p) => [p.id, p]));

      const toInsert = targetIds
        .map((pid, idx) => {
          const part = partMap.get(pid);
          if (!part) return null;
          const norm = part.normalizedData as Record<string, unknown>;
          const existing = existingMap.get(pid);

          return {
            reportId,
            participantId: pid,
            sortOrder: idx,
            visitDate:
              existing?.visitDate ??
              (typeof norm.interviewDate === "string" ? norm.interviewDate : null),
            rulesNarrative: existing?.rulesNarrative ?? null,
            aiNarrative: existing?.aiNarrative ?? null,
            narrative: existing?.narrative ?? null,
            aiMetadata: existing?.aiMetadata ?? null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (toInsert.length > 0) {
        await tx.insert(reportParticipants).values(toInsert);
      }
    }

    await tx
      .update(reports)
      .set({ updatedAt: new Date() })
      .where(eq(reports.id, reportId));
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "report.participants_selected",
    metadata: {
      selectedCount: targetIds.length,
    },
  });

  return { selectedCount: targetIds.length };
}

export async function reorderReportParticipants(
  reportId: string,
  input: ReorderReportParticipantsInput,
  actor: Actor,
) {
  await assertReportAccess(reportId, actor);

  const orderedIds = input.orderedParticipantIds;

  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const pid = orderedIds[i];
      await tx
        .update(reportParticipants)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(
          and(
            eq(reportParticipants.reportId, reportId),
            eq(reportParticipants.participantId, pid),
          ),
        );
    }
  });

  return { success: true };
}

export async function uploadParticipantDocument(params: {
  reportId: string;
  participantId: string;
  documentType: ParticipantDocumentType;
  file: File;
  actor: Actor;
}) {
  const { reportId, participantId, documentType, file, actor } = params;
  await assertReportAccess(reportId, actor);

  const [participant] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.reportId, reportId),
      ),
    )
    .limit(1);

  if (!participant) {
    throw new HttpError(404, "Peserta tidak ditemukan.");
  }

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const storageKey = storageKeys.participantDocument(
    reportId,
    participantId,
    documentType,
    ext,
  );

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await putStorageObject({
    key: storageKey,
    body: buffer,
    contentType: file.type || "image/jpeg",
  });

  const [doc] = await db
    .insert(participantDocuments)
    .values({
      participantId,
      documentType,
      originalFilename: file.name,
      storageKey,
      mimeType: file.type || "image/jpeg",
    })
    .returning();

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "participant_document.uploaded",
    metadata: {
      participantId,
      documentId: doc.id,
      documentType,
      filename: file.name,
    },
  });

  return doc;
}

