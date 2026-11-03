import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  participants,
  reportContents,
  reportParticipants,
  reports,
} from "@/lib/db/schema";
import type { SaveReportContentInput } from "@/lib/validations/content-schema";
import { getReportType } from "@/report-types/registry";
import {
  type Actor,
  assertReportAccess,
  HttpError,
} from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export async function getReportContentData(reportId: string, actor: Actor) {
  const report = await assertReportAccess(reportId, actor);
  const definition = getReportType(report.reportType);

  const [contents, selectedParticipants] = await Promise.all([
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
        aiNarrative: reportParticipants.aiNarrative,
        narrative: reportParticipants.narrative,
        aiMetadata: reportParticipants.aiMetadata,
        normalizedData: participants.normalizedData,
      })
      .from(reportParticipants)
      .innerJoin(
        participants,
        eq(reportParticipants.participantId, participants.id),
      )
      .where(eq(reportParticipants.reportId, reportId))
      .orderBy(asc(reportParticipants.sortOrder)),
  ]);

  const contentsMap: Record<string, Record<string, unknown>> = {};
  for (const c of contents) {
    contentsMap[c.sectionKey] = c.content as Record<string, unknown>;
  }

  // Fallback to default sections content from definition if not yet inserted
  if (definition?.sections) {
    for (const sec of definition.sections) {
      if (!contentsMap[sec.key] && sec.defaultContent) {
        contentsMap[sec.key] = sec.defaultContent;
      }
    }
  }

  const narrativesMap: Record<string, string> = {};
  for (const p of selectedParticipants) {
    narrativesMap[p.participantId] =
      p.narrative || p.rulesNarrative || "";
  }

  return {
    report,
    definition,
    sectionContents: contentsMap,
    participantNarratives: narrativesMap,
    participants: selectedParticipants,
  };
}

export async function saveReportContentData(
  reportId: string,
  input: SaveReportContentInput,
  actor: Actor,
) {
  const report = await assertReportAccess(reportId, actor);

  if (
    input.expectedVersion !== undefined &&
    input.expectedVersion !== report.version
  ) {
    throw new HttpError(
      409,
      "Laporan telah diubah pada sesi lain. Muat ulang halaman sebelum menyimpan.",
    );
  }

  await db.transaction(async (tx) => {
    // 1. Upsert Section Contents
    for (const [sectionKey, content] of Object.entries(input.sectionContents)) {
      const existing = await tx
        .select({ id: reportContents.id, version: reportContents.version })
        .from(reportContents)
        .where(
          and(
            eq(reportContents.reportId, reportId),
            eq(reportContents.sectionKey, sectionKey),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(reportContents)
          .set({
            content,
            version: (existing[0]?.version ?? 1) + 1,
            updatedAt: new Date(),
          })
          .where(eq(reportContents.id, existing[0].id));
      } else {
        await tx.insert(reportContents).values({
          reportId,
          sectionKey,
          content,
          version: 1,
        });
      }
    }

    // 2. Update Participant Narratives
    if (input.participantNarratives) {
      for (const [participantId, narrativeText] of Object.entries(
        input.participantNarratives,
      )) {
        await tx
          .update(reportParticipants)
          .set({
            narrative: narrativeText,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(reportParticipants.reportId, reportId),
              eq(reportParticipants.participantId, participantId),
            ),
          );
      }
    }

    // 3. Increment Report Version
    await tx
      .update(reports)
      .set({
        version: sql`${reports.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "report_content.saved",
    metadata: {
      sectionKeys: Object.keys(input.sectionContents),
      narrativeCount: Object.keys(input.participantNarratives || {}).length,
    },
  });

  return { success: true };
}

