import type { LpdMonevTkmNormalizedRow } from "./row-schema";

function formatRupiah(val: number | null | undefined): string | null {
  if (typeof val !== "number" || !Number.isFinite(val)) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Layer 2 Rules Engine for LPD Monev TKM (PRD §10 & §20).
 * Builds factual Indonesian narrative sentences directly from normalized row data.
 * Adheres strictly to the constraint: Missing/empty data is skipped, NEVER assumed as 0.
 */
export function buildLpdParticipantRulesNarrative(
  row: Partial<LpdMonevTkmNormalizedRow>,
  fiscalYear = 2026,
): string {
  const sentences: string[] = [];
  const name = row.respondentName?.trim() || "Peserta";

  // 1. Profil Usaha & Bidang Usaha
  const sector = row.sector?.trim();
  const businessType = row.businessType?.trim();
  const mainProduct = row.mainProduct?.trim();

  if (sector && businessType) {
    sentences.push(
      `${name} merupakan penerima bantuan Program TKM Lanjutan Tahun ${fiscalYear} dengan bidang usaha ${sector}, yaitu ${businessType}.`,
    );
  } else if (businessType) {
    sentences.push(
      `${name} merupakan penerima bantuan Program TKM Lanjutan Tahun ${fiscalYear} yang menjalankan usaha ${businessType}.`,
    );
  } else {
    sentences.push(
      `${name} merupakan penerima bantuan Program TKM Lanjutan Tahun ${fiscalYear}.`,
    );
  }

  if (mainProduct) {
    sentences.push(`Produk utama yang dihasilkan meliputi ${mainProduct}.`);
  }

  // 2. Tenaga Kerja (PRD §20: currentWorkers dipakai langsung, tidak menjumlahkan kolom yang tumpang tindih)
  const workers = row.currentWorkers;
  if (typeof workers === "number" && workers > 0) {
    sentences.push(
      `Saat ini kegiatan usaha didukung oleh ${workers} orang tenaga kerja.`,
    );
  }

  // 3. Status Bantuan & Pencairan
  const fundAmount = row.fundReceivedAmount;
  const formattedFund = formatRupiah(fundAmount);
  const spending = row.spendingPercentageLabel?.trim();

  if (formattedFund && spending) {
    sentences.push(
      `Peserta telah menerima pencairan dana bantuan sebesar ${formattedFund} dan ${spending.toLowerCase()}.`,
    );
  } else if (formattedFund) {
    sentences.push(
      `Peserta telah menerima pencairan dana bantuan sebesar ${formattedFund}.`,
    );
  }

  // 4. Verifikasi Pembelanjaan & Fisik di Lapangan
  const rab = row.rabCompliance?.trim();
  const receipt = row.receiptAvailability?.trim();
  const fieldCheck = row.fieldBusinessStatus?.trim();

  const verifParts: string[] = [];
  if (fieldCheck) verifParts.push(`usaha dinyatakan ${fieldCheck.toLowerCase()}`);
  if (rab) verifParts.push(`pembelanjaan ${rab.toLowerCase()} dengan RAB`);
  if (receipt) verifParts.push(`bukti transaksi ${receipt.toLowerCase()}`);

  if (verifParts.length > 0) {
    sentences.push(
      `Berdasarkan verifikasi lapangan, ${verifParts.join(", serta ")}.`,
    );
  }

  // 5. Pendampingan Usaha (PTN/PTS)
  const mentoringStatus = row.mentoringStatus?.trim();
  const mentorName = row.mentorNameAndUniversity?.trim();
  const mentoringBenefit = row.mentoringBenefit?.trim();

  if (mentorName) {
    sentences.push(
      `Peserta telah menerima pendampingan usaha dari ${mentorName}.`,
    );
  } else if (mentoringStatus && mentoringStatus.toLowerCase().includes("sudah")) {
    sentences.push(`Peserta telah mendapatkan pendampingan usaha.`);
  }

  if (mentoringBenefit) {
    sentences.push(
      `Manfaat yang dirasakan dari program pendampingan yaitu ${mentoringBenefit.toLowerCase()}.`,
    );
  }

  // 6. Catatan Khusus Lapangan
  const notes = row.notes?.trim();
  if (notes) {
    sentences.push(`Catatan petugas: ${notes}.`);
  }

  return sentences.join(" ");
}

