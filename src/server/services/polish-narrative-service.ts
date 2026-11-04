import { and, eq } from "drizzle-orm";
import { getAiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import { participants, reportParticipants } from "@/lib/db/schema";
import { buildLpdParticipantRulesNarrative } from "@/report-types/lpd-monev-tkm/narrative-rules";
import type { LpdMonevTkmNormalizedRow } from "@/report-types/lpd-monev-tkm/row-schema";
import { getReportType } from "@/report-types/registry";
import { type Actor, assertReportAccess, HttpError } from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export type PolishTargetType =
  | "section_a"
  | "section_b_intro"
  | "participant"
  | "section_c"
  | "closing";

export type PolishMode = "fix" | "enhance";
export type PolishLengthOption = "short" | "medium" | "detailed";

export interface UnifiedPolishOptions {
  targetType: PolishTargetType;
  participantId?: string;
  paragraphIndex?: number;
  currentDraft?: string;
  mode: PolishMode;
  lengthOption: PolishLengthOption;
  additionalInstructions?: string;
}

export async function polishNarrativeUnified(
  reportId: string,
  options: UnifiedPolishOptions,
  actor: Actor,
) {
  const report = await assertReportAccess(reportId, actor);
  const trimmedDraft = options.currentDraft?.trim() || "";
  const isNewDraft = trimmedDraft.length === 0;

  // 1. Tentukan instruksi panjang teks
  let lengthInstruction = "";
  if (options.lengthOption === "short") {
    lengthInstruction =
      "Tuliskan dalam format RINGKAS dan PADAT (sekitar 2-3 kalimat lugas langsung pada pokok bahasan tanpa bertele-tele).";
  } else if (options.lengthOption === "detailed") {
    lengthInstruction =
      "Tuliskan dalam format PANJANG dan KOMPREHENSIF (1-2 paragraf mendalam, menguraikan konteks kebijakan, aspek teknis lapangan, dan penajaman analisis secara komprehensif).";
  } else {
    lengthInstruction =
      "Tuliskan dalam format SEDANG / STANDAR (1 paragraf standar kedinasan yang proporsional, sekitar 4-5 kalimat mengalir rapi dan seimbang).";
  }

  // 2. Kumpulkan konteks data agregat laporan
  const reportRows = await db
    .select({
      normalizedData: participants.normalizedData,
    })
    .from(reportParticipants)
    .innerJoin(
      participants,
      eq(reportParticipants.participantId, participants.id),
    )
    .where(eq(reportParticipants.reportId, reportId));

  const totalParticipants = reportRows.length;
  const regenciesSet = new Set<string>();
  const provincesSet = new Set<string>();
  const sectorsSet = new Set<string>();
  let totalRevenue = 0;
  let revenueCount = 0;
  let totalWorkers = 0;
  let workersCount = 0;

  for (const row of reportRows) {
    const norm = (row.normalizedData || {}) as Partial<LpdMonevTkmNormalizedRow>;
    if (norm.interviewRegency?.trim()) regenciesSet.add(norm.interviewRegency.trim());
    if (norm.interviewProvince?.trim()) provincesSet.add(norm.interviewProvince.trim());
    if (norm.sector?.trim()) sectorsSet.add(norm.sector.trim());

    if (typeof norm.monthlyRevenue === "number" && norm.monthlyRevenue > 0) {
      totalRevenue += norm.monthlyRevenue;
      revenueCount++;
    }
    if (typeof norm.currentWorkers === "number" && norm.currentWorkers > 0) {
      totalWorkers += norm.currentWorkers;
      workersCount++;
    }
  }

  const avgRevenue =
    revenueCount > 0 ? Math.round(totalRevenue / revenueCount) : 0;
  const formattedAvgRevenue =
    avgRevenue > 0
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(avgRevenue)
      : null;

  const aggregateFacts = {
    reportName: report.name,
    fiscalYear: report.fiscalYear,
    totalParticipants,
    regions: Array.from(regenciesSet).slice(0, 10).join(", ") || "-",
    provinces: Array.from(provincesSet).join(", ") || "-",
    dominantSectors: Array.from(sectorsSet).slice(0, 8).join(", ") || "-",
    avgMonthlyRevenue: formattedAvgRevenue || "bervariasi",
    totalObservedWorkers: totalWorkers,
  };

  // 3. Konfigurasi konteks per targetType
  let sectionLabel = "";
  let targetSpecificFacts: Record<string, unknown> = { ...aggregateFacts };
  let participantDbRow: typeof reportParticipants.$inferSelect | null = null;

  if (options.targetType === "section_a") {
    sectionLabel = `Bagian A (Umum / Latar Belakang & Maksud Penugasan) - Paragraf ke-${(options.paragraphIndex ?? 0) + 1}`;
  } else if (options.targetType === "section_b_intro") {
    sectionLabel = "Bagian B (Poin e - Narasi Hasil Penugasan Wilayah Sebelum Tabel Rincian)";
  } else if (options.targetType === "section_c") {
    sectionLabel = `Bagian C (Kesimpulan & Evaluasi Pelaksanaan Kegiatan) - Paragraf ke-${(options.paragraphIndex ?? 0) + 1}`;
  } else if (options.targetType === "closing") {
    sectionLabel = "Bagian Penutup Dokumen Laporan (Sebelum Tanda Tangan)";
  } else if (options.targetType === "participant") {
    if (!options.participantId) {
      throw new HttpError(400, "participantId wajib disertakan untuk target participant.");
    }

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
          eq(reportParticipants.participantId, options.participantId),
        ),
      )
      .limit(1);

    if (!row) {
      throw new HttpError(404, "Data peserta terpilih tidak ditemukan.");
    }

    participantDbRow = row as unknown as typeof reportParticipants.$inferSelect;
    const norm = (row.normalizedData || {}) as Partial<LpdMonevTkmNormalizedRow>;

    // Filter facts PII sanitization
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

    sectionLabel = `Hasil Kunjungan Lapangan Peserta: ${norm.respondentName || "Peserta"}`;
    targetSpecificFacts = {
      ...sanitizedFacts,
      fiscalYear: report.fiscalYear,
    };
  }

  // 4. Susun Instruksi Mode (Perbaiki vs Sempurnakan)
  let modeInstruction = "";
  if (isNewDraft) {
    modeInstruction = `Draf saat ini masih KOSONG. Tugas Anda adalah MEMBUATKAN DRAF NARASI BARU yang akurat, profesional, dan selaras dengan fakta untuk konteks ${sectionLabel}.`;
  } else if (options.mode === "fix") {
    modeInstruction = `Mode PERBAIKI: Fokus pada perbaikan tata bahasa kedinasan (EYD/KBBI), struktur kalimat, kohesi, dan ejaan tanpa mengubah makna faktual atau menambahkan klaim baru yang tidak ada pada draf asli. Pertahankan fakta angka dan nama.`;
  } else {
    // Mode enhance / Sempurnakan
    modeInstruction = `Mode SEMPURNAKAN: Perkaya dan pertajam analisis, elaborasi konteks pelaksanaan secara komprehensif, serta tingkatkan bobot profesionalitas kedinasan narasi agar lebih komprehensif, deskriptif, dan mengalir dengan sangat baik.`;
  }

  const additionalInst = options.additionalInstructions?.trim()
    ? `\nInstruksi Tambahan Pengguna: "${options.additionalInstructions.trim()}"`
    : "";

  const taskDraft = isNewDraft
    ? `${modeInstruction}${additionalInst}`
    : `${modeInstruction}${additionalInst}\n\nDraf Asli:\n"""\n${trimmedDraft}\n"""`;

  const constraints = [
    lengthInstruction,
    "Gunakan bahasa Indonesia baku resmi kedinasan Kementerian Ketenagakerjaan RI (Kemnaker) / BBPKK Bandung Barat.",
    "Jaga konsistensi data fakta: dilarang mengarang fakta fiktif atau mengubah angka dan nama yang sudah ada.",
    "Kembalikan HANYA teks paragraf hasil poles tanpa kata pengantar (seperti 'Berikut hasil...'), tanpa tanda kutip pembuka/penutup, dan tanpa format markdown bullet/bold di luar teks murni.",
  ];

  // 5. Eksekusi ke AI Provider
  const aiProvider = getAiProvider();
  const aiResult = await aiProvider.enhance({
    task: "improve_narrative",
    facts: {
      ...targetSpecificFacts,
      sectionContext: sectionLabel,
      mode: options.mode,
      lengthOption: options.lengthOption,
      isNewDraft,
    },
    draft: taskDraft,
    constraints,
  });

  const polishedText = aiResult.text.trim();

  // 6. Jika target adalah participant, simpan metadata AI ke DB (aiNarrative)
  if (options.targetType === "participant" && options.participantId) {
    await db
      .update(reportParticipants)
      .set({
        aiNarrative: polishedText,
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
          eq(reportParticipants.participantId, options.participantId),
        ),
      );
  }

  // 7. Audit Log
  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: `narrative.polished_${options.targetType}`,
    metadata: {
      targetType: options.targetType,
      participantId: options.participantId,
      paragraphIndex: options.paragraphIndex,
      mode: options.mode,
      lengthOption: options.lengthOption,
      isNewDraft,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    },
  });

  return {
    polishedText,
    model: aiResult.model,
    durationMs: aiResult.durationMs,
    mode: options.mode,
    lengthOption: options.lengthOption,
  };
}

