import { and, eq, inArray } from "drizzle-orm";
import { getAiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  participants,
  reportParticipants,
  reports,
} from "@/lib/db/schema";
import { buildLpdParticipantRulesNarrative } from "@/report-types/lpd-monev-tkm/narrative-rules";
import type { LpdMonevTkmNormalizedRow } from "@/report-types/lpd-monev-tkm/row-schema";
import { getReportType } from "@/report-types/registry";
import {
  type Actor,
  assertReportAccess,
  HttpError,
} from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export async function generateRulesNarrativesForReport(
  reportId: string,
  actor: Actor,
  participantId?: string,
) {
  const report = await assertReportAccess(reportId, actor);

  const conditions = [eq(reportParticipants.reportId, reportId)];
  if (participantId) {
    conditions.push(eq(reportParticipants.participantId, participantId));
  }

  const selectedRows = await db
    .select({
      participantId: reportParticipants.participantId,
      normalizedData: participants.normalizedData,
      existingRulesNarrative: reportParticipants.rulesNarrative,
      existingNarrative: reportParticipants.narrative,
    })
    .from(reportParticipants)
    .innerJoin(
      participants,
      eq(reportParticipants.participantId, participants.id),
    )
    .where(and(...conditions));

  if (selectedRows.length === 0) {
    throw new HttpError(
      400,
      "Tidak ada peserta yang dipilih untuk digenerate narasinya.",
    );
  }

  const updatedItems = [];

  for (const item of selectedRows) {
    const norm = item.normalizedData as Partial<LpdMonevTkmNormalizedRow>;
    const generatedRulesText = buildLpdParticipantRulesNarrative(
      norm,
      report.fiscalYear,
    );

    // If active narrative was empty or matched old rules narrative, update it
    const shouldUpdateActive =
      !item.existingNarrative ||
      item.existingNarrative === item.existingRulesNarrative;

    const [updated] = await db
      .update(reportParticipants)
      .set({
        rulesNarrative: generatedRulesText,
        narrative: shouldUpdateActive ? generatedRulesText : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reportParticipants.reportId, reportId),
          eq(reportParticipants.participantId, item.participantId),
        ),
      )
      .returning();

    updatedItems.push(updated);
  }

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "narrative.rules_generated",
    metadata: {
      count: updatedItems.length,
      singleParticipantId: participantId ?? null,
    },
  });

  return { count: updatedItems.length, items: updatedItems };
}

export async function enhanceNarrativeWithAi(
  reportId: string,
  participantId: string,
  actor: Actor,
) {
  const report = await assertReportAccess(reportId, actor);
  const definition = getReportType(report.reportType);

  const [row] = await db
    .select({
      participantId: reportParticipants.participantId,
      normalizedData: participants.normalizedData,
      rulesNarrative: reportParticipants.rulesNarrative,
      narrative: reportParticipants.narrative,
    })
    .from(reportParticipants)
    .innerJoin(
      participants,
      eq(reportParticipants.participantId, participants.id),
    )
    .where(
      and(
        eq(reportParticipants.reportId, reportId),
        eq(reportParticipants.participantId, participantId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new HttpError(404, "Data peserta terpilih tidak ditemukan.");
  }

  const norm = row.normalizedData as Partial<LpdMonevTkmNormalizedRow>;
  const draftText =
    row.narrative ||
    row.rulesNarrative ||
    buildLpdParticipantRulesNarrative(norm, report.fiscalYear);

  // Filter facts: PII Sanitization (Excludes NIK, phone, full address)
  const allowedKeys = definition?.aiPromptConfig?.allowedFactKeys || [
    "respondentName",
    "sector",
    "businessType",
    "mainProduct",
    "currentWorkers",
    "fundReceivedAmount",
    "spendingPercentageLabel",
    "fieldBusinessStatus",
    "rabCompliance",
    "receiptAvailability",
    "mentorNameAndUniversity",
    "mentoringBenefit",
  ];

  const sanitizedFacts: Record<string, unknown> = {};
  for (const k of allowedKeys) {
    if (k in norm && norm[k as keyof typeof norm] !== undefined) {
      sanitizedFacts[k] = norm[k as keyof typeof norm];
    }
  }

  const aiProvider = getAiProvider();
  const aiResult = await aiProvider.enhance({
    task: "improve_narrative",
    language: "id",
    facts: sanitizedFacts,
    draft: draftText,
    constraints: definition?.aiPromptConfig?.constraints,
  });

  const [updated] = await db
    .update(reportParticipants)
    .set({
      aiNarrative: aiResult.text,
      aiMetadata: {
        model: aiResult.model,
        promptVersion: aiResult.promptVersion,
        durationMs: aiResult.durationMs,
        generatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reportParticipants.reportId, reportId),
        eq(reportParticipants.participantId, participantId),
      ),
    )
    .returning();

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "narrative.ai_enhanced",
    metadata: {
      participantId,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    },
  });

  return {
    participantId,
    aiNarrative: aiResult.text,
    rulesNarrative: row.rulesNarrative || draftText,
    currentNarrative: row.narrative || draftText,
    aiMetadata: updated.aiMetadata,
  };
}

export async function polishIntroNarrativeWithAi(
  reportId: string,
  currentIntro: string,
  actor: Actor,
) {
  const report = await assertReportAccess(reportId, actor);
  const aiProvider = getAiProvider();

  const aiResult = await aiProvider.enhance({
    task: "improve_narrative",
    facts: {
      reportName: report.name,
      fiscalYear: report.fiscalYear,
    },
    draft: currentIntro,
    constraints: [
      "Pertahankan nama kabupaten/kota, provinsi, serta konteks kegiatan (TKM Lanjutan).",
      "Keluarkan HANYA kalimat hasil perbaikan tanpa tanda kutip, tanpa penjelasan tambahan, dan tanpa markdown formatting.",
    ],
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "intro_narrative.ai_enhanced",
    metadata: {
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    },
  });

  return {
    text: aiResult.text.trim(),
    model: aiResult.model,
    durationMs: aiResult.durationMs,
  };
}

export async function updateParticipantNarrative(
  reportId: string,
  participantId: string,
  narrativeText: string,
  actor: Actor,
) {
  await assertReportAccess(reportId, actor);

  const [updated] = await db
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
    )
    .returning();

  if (!updated) {
    throw new HttpError(404, "Peserta tidak ditemukan.");
  }

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "narrative.updated",
    metadata: {
      participantId,
      narrativeLength: narrativeText.length,
    },
  });

  return updated;
}

