import { and, eq } from "drizzle-orm";
import { getAiProvider } from "@/lib/ai";
import { db } from "@/lib/db";
import { participants, reportParticipants, reports } from "@/lib/db/schema";
import type { LpdMonevTkmNormalizedRow } from "@/report-types/lpd-monev-tkm/row-schema";
import { type Actor, assertReportAccess, HttpError } from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export type ParagraphLengthOption = "short" | "medium" | "detailed";

export interface GenerateParagraphOptions {
  sectionKey: "section_a" | "section_c";
  paragraphIndex: number;
  currentDraft?: string;
  lengthOption: ParagraphLengthOption;
  additionalInstructions?: string;
}

export async function generateParagraphWithAi(
  reportId: string,
  options: GenerateParagraphOptions,
  actor: Actor,
) {
  const report = await assertReportAccess(reportId, actor);

  // 1. Ambil data agregat peserta terkait laporan ini
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

  const summaryAggregate = {
    reportName: report.name,
    fiscalYear: report.fiscalYear,
    totalParticipants,
    regions: Array.from(regenciesSet).slice(0, 10).join(", ") || "-",
    provinces: Array.from(provincesSet).join(", ") || "-",
    dominantSectors: Array.from(sectorsSet).slice(0, 8).join(", ") || "-",
    avgMonthlyRevenue: formattedAvgRevenue || "belum terdata / bervariasi",
    totalObservedWorkers: totalWorkers,
  };

  // 2. Tentukan petunjuk panjang teks
  let lengthInstruction = "";
  if (options.lengthOption === "short") {
    lengthInstruction =
      "Tuliskan dalam format SINGKAT dan PADAT (1 paragraf ringkas, sekitar 2-3 kalimat lugas langsung pada pokok bahasan).";
  } else if (options.lengthOption === "detailed") {
    lengthInstruction =
      "Tuliskan dalam PENJELASAN LEBAR dan MENDALAM (1-2 paragraf komprehensif, menguraikan konteks kebijakan, operasional lapangan, dan hasil pengamatan secara mendalam).";
  } else {
    lengthInstruction =
      "Tuliskan dalam format SEDANG (1 paragraf standar kedinasan, sekitar 4-5 kalimat mengalir rapi dan seimbang).";
  }

  const sectionContext =
    options.sectionKey === "section_a"
      ? "Bagian A (Umum / Latar Belakang & Maksud Penugasan Monitoring)"
      : "Bagian C (Kesimpulan & Evaluasi Pelaksanaan Kegiatan)";

  const trimmedDraft = options.currentDraft?.trim() || "";
  const isNewDraft = trimmedDraft.length === 0;

  const taskPrompt = isNewDraft
    ? `Tugas Anda adalah MEMBUATKAN DRAF BARU untuk paragraf ke-${options.paragraphIndex + 1} pada ${sectionContext}.
Gunakan konteks ringkasan data lapangan di atas dan struktur laporan resmi BBPKK Bandung Barat / Kemnaker RI.`
    : `Tugas Anda adalah MEMPERBAIKI DAN MENYEMPURNAKAN DRAF PARAGRAF ke-${options.paragraphIndex + 1} pada ${sectionContext}.
Draf awal:
"""
${trimmedDraft}
"""
Sempurnakan gaya bahasa agar formal, runtut, baku, dan selaras dengan fakta ringkasan data lapangan.`;

  const additionalInst = options.additionalInstructions?.trim()
    ? `\nInstruksi Tambahan dari Pengguna: "${options.additionalInstructions.trim()}"`
    : "";

  const constraints = [
    lengthInstruction,
    "Gunakan bahasa Indonesia baku kedinasan (EYD/KBBI) dengan gaya penulisan laporan dinas Kementerian Ketenagakerjaan RI.",
    "Jaga konsistensi data fakta: jangan mengarang angka atau nama institusi lain selain konteks TKM Lanjutan / BBPKK Bandung Barat / Kemnaker.",
    "Kembalikan HANYA teks paragraf hasil generasi tanpa awalan seperti 'Berikut adalah...', tanpa tanda petik pembuka/penutup, dan tanpa format bullet point.",
  ];

  const aiProvider = getAiProvider();
  const aiResult = await aiProvider.enhance({
    task: "improve_narrative",
    facts: {
      ...summaryAggregate,
      section: sectionContext,
      paragraphNumber: options.paragraphIndex + 1,
      mode: isNewDraft ? "create_new" : "refine_draft",
    },
    draft: `${taskPrompt}${additionalInst}`,
    constraints,
  });

  await recordAuditLog({
    userId: actor.id,
    reportId,
    action: "paragraph.ai_generated",
    metadata: {
      sectionKey: options.sectionKey,
      paragraphIndex: options.paragraphIndex,
      lengthOption: options.lengthOption,
      isNewDraft,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    },
  });

  return {
    paragraphText: aiResult.text.trim(),
    model: aiResult.model,
    durationMs: aiResult.durationMs,
  };
}

