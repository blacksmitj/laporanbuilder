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

/**
 * Extract unique regencies and provinces from participants to form standard Intro Point (e).
 * e.g. "Kab. Pekalongan, Kota Pekalongan, Kab. Batang, Kab. Tegal dan Kab. Brebes - Provinsi Jawa Tengah"
 */
export function buildLpdMonitoringRegionIntro(
  participants: Array<{
    interviewRegency?: string | null;
    interviewProvince?: string | null;
    normalizedData?: Record<string, unknown> | null;
  }>,
  fallbackRegion?: string | null,
): {
  pointE: string;
  tableIntro: string;
} {
  const regenciesSet = new Set<string>();
  const provincesSet = new Set<string>();

  for (const p of participants) {
    const regency =
      p.interviewRegency ||
      (typeof p.normalizedData?.interviewRegency === "string"
        ? (p.normalizedData.interviewRegency as string)
        : null);

    const province =
      p.interviewProvince ||
      (typeof p.normalizedData?.interviewProvince === "string"
        ? (p.normalizedData.interviewProvince as string)
        : null);

    if (regency?.trim()) regenciesSet.add(regency.trim());
    if (province?.trim()) provincesSet.add(province.trim());
  }

  const regencyList = Array.from(regenciesSet);
  const provinceList = Array.from(provincesSet);

  let locationText = "";
  if (regencyList.length > 0) {
    if (regencyList.length === 1) {
      locationText = regencyList[0];
    } else {
      const last = regencyList[regencyList.length - 1];
      const initial = regencyList.slice(0, -1).join(", ");
      locationText = `${initial} dan ${last}`;
    }

    if (provinceList.length > 0) {
      locationText += ` - Provinsi ${provinceList.join(", ")}`;
    }
  } else if (fallbackRegion?.trim()) {
    locationText = fallbackRegion.trim();
  } else {
    locationText = "wilayah tugas";
  }

  const pointE = `Berkenaan dengan pelaksanaan kegiatan TKM Lanjutan, tim melakukan Monitoring di ${locationText};`;
  const tableIntro = "Adapun Monitoring yang dilakukan dirinci dalam tabel sebagai berikut :";

  return { pointE, tableIntro };
}

/**
 * Format subject / maksud perjalanan dinas text based on selected participants' locations and fiscal year.
 * e.g. "Monitoring dan Evaluasi Peserta TKM Lanjutan tahun Anggaran 2026 di Kab. Pekalongan, Kota Pekalongan, Kab. Batang, Kab. Tegal dan Kab. Brebes - Provinsi Jawa Tengah;"
 */
export function buildLpdSubjectMaksud(
  participants: Array<{
    interviewRegency?: string | null;
    interviewProvince?: string | null;
    normalizedData?: Record<string, unknown> | null;
  }>,
  fiscalYear: number | string = 2026,
  fallbackRegion?: string | null,
): string {
  const regenciesSet = new Set<string>();
  const provincesSet = new Set<string>();

  for (const p of participants) {
    const regency =
      p.interviewRegency ||
      (typeof p.normalizedData?.interviewRegency === "string"
        ? (p.normalizedData.interviewRegency as string)
        : null);

    const province =
      p.interviewProvince ||
      (typeof p.normalizedData?.interviewProvince === "string"
        ? (p.normalizedData.interviewProvince as string)
        : null);

    if (regency?.trim()) regenciesSet.add(regency.trim());
    if (province?.trim()) provincesSet.add(province.trim());
  }

  const regencyList = Array.from(regenciesSet);
  const provinceList = Array.from(provincesSet);

  let locationText = "";
  if (regencyList.length > 0) {
    if (regencyList.length === 1) {
      locationText = regencyList[0];
    } else {
      const last = regencyList[regencyList.length - 1];
      const initial = regencyList.slice(0, -1).join(", ");
      locationText = `${initial} dan ${last}`;
    }

    if (provinceList.length > 0) {
      locationText += ` - Provinsi ${provinceList.join(", ")}`;
    }
  } else if (fallbackRegion?.trim()) {
    locationText = fallbackRegion.trim();
  }

  const locSuffix = locationText ? ` di ${locationText};` : ";";
  return `Monitoring dan Evaluasi Peserta TKM Lanjutan tahun Anggaran ${fiscalYear}${locSuffix}`;
}
