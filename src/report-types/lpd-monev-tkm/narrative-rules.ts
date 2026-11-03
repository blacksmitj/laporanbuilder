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
 * Format address parts into clean Indonesian street address string matching template.
 * e.g. "Dk. Gondangsari RT. 001 RW. 005, Randu, Pecalungan, Kab. Batang, Jawa Tengah"
 */
export function buildLpdBusinessAddress(
  row: Partial<LpdMonevTkmNormalizedRow>,
): string {
  const parts: string[] = [];
  if (row.interviewAddress?.trim()) parts.push(row.interviewAddress.trim());
  if (row.interviewVillage?.trim()) parts.push(row.interviewVillage.trim());
  if (row.interviewDistrict?.trim()) parts.push(row.interviewDistrict.trim());
  if (row.interviewRegency?.trim()) parts.push(row.interviewRegency.trim());
  if (row.interviewProvince?.trim()) parts.push(row.interviewProvince.trim());

  return parts.length > 0 ? parts.join(", ") : "-";
}

/**
 * Format Business Title & Sector/Type matching template Pekalongan Col 3.
 * e.g. "Canggih Komputer - Jasa Service dan Jual Beli Komputer"
 */
export function buildLpdBusinessDescription(
  row: Partial<LpdMonevTkmNormalizedRow>,
): string {
  const businessType = row.businessType?.trim();
  const mainProduct = row.mainProduct?.trim();
  const sector = row.sector?.trim();

  if (businessType && mainProduct) {
    return `${businessType} dengan produk ${mainProduct}`;
  }
  if (businessType) return businessType;
  if (sector && mainProduct) return `${sector} (${mainProduct})`;
  if (sector) return sector;
  return "-";
}

/**
 * Layer 2 Rules Engine for LPD Monev TKM (PRD §10, §20 & Pekalongan 2026 Template).
 * Produces concise, professional factual narrative for the 'Hasil Monitoring' column.
 */
export function buildLpdParticipantRulesNarrative(
  row: Partial<LpdMonevTkmNormalizedRow>,
  fiscalYear = 2026,
): string {
  const clauses: string[] = [];

  // 1. Penguasaan & Keberjalanan Usaha
  const fieldCheck = row.fieldBusinessStatus?.trim();
  if (fieldCheck && fieldCheck.toLowerCase().includes("berjalan")) {
    clauses.push("Penerima bantuan menguasai usaha dengan baik");
  } else if (fieldCheck) {
    clauses.push(`Kondisi usaha di lapangan tercatat ${fieldCheck.toLowerCase()}`);
  } else {
    clauses.push("Penerima bantuan menjalankan usaha dengan baik");
  }

  // 2. Perkembangan alat dan bahan
  const itemsCheck =
    row.purchasedEquipmentAvailability?.trim() ||
    row.purchasedMaterialAvailability?.trim();
  const rabCheck = row.rabCompliance?.trim();
  if (
    itemsCheck?.toLowerCase().includes("ada") ||
    itemsCheck?.toLowerCase().includes("lengkap") ||
    itemsCheck?.toLowerCase().includes("sesuai") ||
    rabCheck?.toLowerCase().includes("sesuai")
  ) {
    clauses.push("usahanya berkembang dari segi bahan dan alat");
  }

  // 3. Wilayah Pemasaran
  const marketingArea = row.marketingArea?.trim();
  const marketingExpansion = row.marketingAreaExpansion?.trim();
  if (marketingArea) {
    clauses.push(`wilayah pemasaran menjangkau ${marketingArea}`);
  } else if (marketingExpansion && !marketingExpansion.toLowerCase().includes("tidak")) {
    clauses.push(`pemasaran semakin meluas (${marketingExpansion})`);
  }

  // 4. Omset bulanan & Pertumbuhan
  const revenue = row.monthlyRevenue;
  const growth = row.productionGrowthPercentage;

  if (typeof revenue === "number" && revenue > 0) {
    const formattedRevenue = formatRupiah(revenue);
    if (typeof growth === "number" && growth > 0) {
      clauses.push(
        `omset yang dihasilkan sekitar ${formattedRevenue}/bulan dengan peningkatan produksi/penjualan sekitar ${growth}%`,
      );
    } else {
      clauses.push(`omset yang dihasilkan sekitar ${formattedRevenue}/bulan`);
    }
  } else if (typeof growth === "number" && growth > 0) {
    clauses.push(`pertambahan produksi atau penjualan meningkat sekitar ${growth}%`);
  }

  let narrativeText = clauses.length > 0 ? clauses.join(", ") + "." : "";

  // 5. Tenaga kerja (jika ada)
  const workers = row.currentWorkers;
  if (typeof workers === "number" && workers > 0) {
    narrativeText += ` Didukung oleh ${workers} orang tenaga kerja.`;
  }

  // 6. Catatan lapangan tambahan (jika ada)
  const notes = row.notes?.trim();
  if (notes) {
    narrativeText += ` Catatan: ${notes}.`;
  }

  return narrativeText.trim();
}
