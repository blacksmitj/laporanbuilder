import { normalizeHeaderKey } from "@/lib/excel/normalizers";

export type ColumnValueKind =
  | "text"
  | "titleName"
  | "identifier"
  | "date"
  | "integer"
  | "percentage"
  | "booleanText";

export interface ColumnFieldSpec {
  key: string;
  header: string;
  group:
    | "interview"
    | "disbursement"
    | "respondent"
    | "business"
    | "programFeedback"
    | "lpj"
    | "verification"
    | "growth"
    | "workforce"
    | "mentoring"
    | "documentation";
  kind: ColumnValueKind;
  required?: boolean;
}

export const lpdMonevTkmColumnSpecs: ColumnFieldSpec[] = [
  // 1. Interview & Lokasi
  {
    key: "sourceNo",
    header: "No",
    group: "interview",
    kind: "integer",
  },
  {
    key: "interviewDate",
    header: "Tanggal Wawancara",
    group: "interview",
    kind: "date",
    required: true,
  },
  {
    key: "team",
    header: "TEAM",
    group: "interview",
    kind: "text",
  },
  {
    key: "disbursementDate",
    header: "Tanggal Pencairan",
    group: "disbursement",
    kind: "date",
  },
  {
    key: "spendingPercentageLabel",
    header: "Prosentase Pembelanjaan",
    group: "disbursement",
    kind: "text",
  },
  {
    key: "interviewAddress",
    header: "Alamat Wawancara",
    group: "interview",
    kind: "text",
  },
  {
    key: "interviewVillage",
    header: "Desa/Kelurahan tempat Wawancara",
    group: "interview",
    kind: "text",
  },
  {
    key: "interviewDistrict",
    header: "Kecamatan tempat Wawancara",
    group: "interview",
    kind: "text",
  },
  {
    key: "interviewRegency",
    header: "Kabupaten/Kota tempat Wawancara",
    group: "interview",
    kind: "text",
    required: true,
  },
  {
    key: "interviewProvince",
    header: "Provinsi tempat Wawancara",
    group: "interview",
    kind: "text",
    required: true,
  },

  // 2. Identitas Responden
  {
    key: "respondentName",
    header: "Nama Responden",
    group: "respondent",
    kind: "titleName",
    required: true,
  },
  {
    key: "nik",
    header: "NIK Responden",
    group: "respondent",
    kind: "identifier",
    required: true,
  },
  {
    key: "tkmId",
    header: "ID TKM Lanjutan Responden",
    group: "respondent",
    kind: "identifier",
    required: true,
  },
  {
    key: "gender",
    header: "Jenis Kelamin",
    group: "respondent",
    kind: "text",
  },
  {
    key: "age",
    header: "Usia",
    group: "respondent",
    kind: "integer",
  },
  {
    key: "education",
    header: "Pendidikan Terakhir",
    group: "respondent",
    kind: "text",
  },
  {
    key: "phone",
    header: "Nomor Telepon/WA",
    group: "respondent",
    kind: "identifier",
  },

  // 3. Profil Usaha & Keuangan Saat Ini
  {
    key: "sector",
    header: "Sektor Usaha",
    group: "business",
    kind: "text",
  },
  {
    key: "businessType",
    header: "Jenis Usaha",
    group: "business",
    kind: "text",
  },
  {
    key: "mainProduct",
    header: "Produk Utama",
    group: "business",
    kind: "text",
  },
  {
    key: "initialWorkers",
    header: "Jumlah Tenaga Kerja awal",
    group: "business",
    kind: "integer",
  },
  {
    key: "monthlyRevenue",
    header:
      "Rata-rata Omset Usaha per Bulan/Periode saat ini (dalam Rupiah)",
    group: "business",
    kind: "integer",
  },
  {
    key: "monthlyNetProfit",
    header:
      "Rata-rata Laba Bersih usaha per Bulan/Periode saat ini (dalam Rupiah)",
    group: "business",
    kind: "integer",
  },
  {
    key: "marketingChannel",
    header: "Saluran Pemasaran Produk",
    group: "business",
    kind: "text",
  },
  {
    key: "marketingArea",
    header: "Wilayah Pemasaran",
    group: "business",
    kind: "text",
  },
  {
    key: "socialMediaPlatform",
    header: "Media Sosial Usaha",
    group: "business",
    kind: "text",
  },
  {
    key: "socialMediaAccount",
    header: "Nama Akun Media Sosial Usaha",
    group: "business",
    kind: "text",
  },

  // 4. Informasi Program, Pendaftaran, Seleksi & Pembekalan
  {
    key: "programInfoSource",
    header: "Darimana memperoleh informasi Program TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "registrationMonthYear",
    header:
      "Kapan ANDA mendaftarkan diri untuk mengikuti Program TKM Lanjutan (Bulan dan Tahun)",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "hasReadJuknis",
    header:
      "Apakah ANDA pernah membaca Petunjuk Teknis penyaluran TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "juknisClarityFeedback",
    header:
      "Jika 'Ya', bagaimana isi juknis. Apakah jelas dan membantu dalam mengikuti Program TKM Lanjutan?",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "hasAccessedBizhub",
    header: "Apakah ANDA pernah mengakses laman Bizhub",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "registeredBy",
    header: "Siapa yang mendaftarkan ANDA dalam Program TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "registrationProcessOpinion",
    header: "Menurut ANDA, Bagaimana proses Pendaftaran TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "requirementsOpinion",
    header:
      "Menurut ANDA, Bagaimana persyaratan untuk mengikuti Program TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "registrationObstacle",
    header: "Apa kendala yang dihadapi selama Pendaftaran TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "knowsSelectionProcess",
    header:
      "Apakah ANDA mengetahui seluruh rangkaian proses Seleksi TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "hardestSelectionStage",
    header:
      "Dari semua tahapan Seleksi Program TKM Lanjutan, menurut ANDA mana yang paling sulit",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "processTransparencyOpinion",
    header:
      "Menurut ANDA, Bagaimana keterbukaan alur proses dari Pendaftaran, Seleksi sampai dengan Penetapan Penerima Bantuan TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "selectionResultInfoSource",
    header:
      "Darimana ANDA mendapat informasi bahwa ANDA lolos seleksi penerima bantuan TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "briefingMode",
    header: "Apakah ANDA mengikuti pembekalan secara Offline/Online",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "briefingBenefitOpinion",
    header:
      "Menurut pendapat ANDA, bagaimana manfaat materi dalam pembekalan Program TKM Lanjutan bagi usaha ANDA?",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "otherNeedsBesidesCapital",
    header:
      "Selain modal, apa yang ANDA butuhkan bagi pengembangan usaha ANDA?",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "missingBriefingMaterial",
    header:
      "Materi apa yang ANDA perlukan namun belum ada dalam pembekalan? Sebutkan!",
    group: "programFeedback",
    kind: "text",
  },

  // 5. Pencairan Dana & Kepuasan Program
  {
    key: "hasDisbursedFund",
    header:
      "Apakah usaha yang ANDA ikuti dalam Program TKM Lanjutan sudah mencairkan dana bantuan?",
    group: "disbursement",
    kind: "text",
  },
  {
    key: "fundReceivedAmount",
    header: "Berapa jumlah DANA yang Anda terima? (dalam rupiah)",
    group: "disbursement",
    kind: "integer",
  },
  {
    key: "hasBankDisbursementObstacle",
    header:
      "Apakah ANDA mengalami kendala pada saat pencairan bantuan di Bank yang ditunjuk?",
    group: "disbursement",
    kind: "text",
  },
  {
    key: "bankDisbursementObstacleDetail",
    header:
      "Jika 'Ya' kendala apa yang ANDA hadapi pada saat pencairan dana bantuan?",
    group: "disbursement",
    kind: "text",
  },
  {
    key: "fundSufficiencyOpinion",
    header:
      "Menurut pendapat ANDA, apakah jumlah bantuan tersebut cukup untuk membantu kebutuhan usaha yang diajukan di proposal?",
    group: "disbursement",
    kind: "text",
  },
  {
    key: "programBenefitLevel",
    header:
      "Seberapa besar manfaat yang ANDA rasakan dari Program TKM Lanjutan?",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "programSatisfactionLevel",
    header: "Bagaimana tingkat kepuasan ANDA terhadap Program TKM Lanjutan",
    group: "programFeedback",
    kind: "text",
  },
  {
    key: "programSatisfactionReason",
    header: "Berikan alasan dari tingkat kepuasan ANDA!",
    group: "programFeedback",
    kind: "text",
  },

  // 6. Laporan Pertanggungjawaban (LPJ)
  {
    key: "knowsLpjObligation",
    header:
      "Apakah ANDA mengetahui adanya kewajiban untuk menyusun dan mengirimkan Laporan Pertanggungjawaban (LPJ) Keuangan Bantuan TKM Lanjutan?",
    group: "lpj",
    kind: "text",
  },
  {
    key: "hasReadLpjMechanism",
    header:
      "Apakah ANDA sudah membaca Mekanisme penggunaan dana dan Pertanggungjawaban Dana TKM Lanjutan?",
    group: "lpj",
    kind: "text",
  },
  {
    key: "hasLpjWritingDifficulty",
    header:
      "Apakah terdapat kesulitan dalam menyusun LPJ keuangan Bantuan TKM Lanjutan?",
    group: "lpj",
    kind: "text",
  },
  {
    key: "lpjWritingDifficultyDetail",
    header:
      "Jika 'Ya', sebutkan kesulitan yang ANDA temui dalam menyusun LPJ keuangan?",
    group: "lpj",
    kind: "text",
  },
  {
    key: "hasLpjUploadDifficulty",
    header:
      "Apakah terdapat kesulitan dalam mengunggah LPJ Keuangan Bantuan TKM Lanjutan di laman Bizhub?",
    group: "lpj",
    kind: "text",
  },
  {
    key: "lpjUploadDifficultyDetail",
    header:
      "Jika 'Ya', sebutkan kesulitan yang ANDA temui dalam mengunggah LPJ keuangan?",
    group: "lpj",
    kind: "text",
  },
  {
    key: "knowsSanction",
    header:
      "Apakah ANDA mengetahui adanya sanksi apabila ANDA tidak menggunakan dana bantuan sebagaimana mestinya dan tidak membuat LPJ sesuai dengan jangka waktu yang ditetapkan?",
    group: "lpj",
    kind: "text",
  },

  // 7. Verifikasi Lapangan & Bukti Pembelanjaan
  {
    key: "rabCompliance",
    header: "Kesesuaian nilai pembelanjaan dengan RAB",
    group: "verification",
    kind: "text",
  },
  {
    key: "receiptAvailability",
    header: "Ketersediaan bukti pembelanjaan (nota/kwitansi)",
    group: "verification",
    kind: "text",
  },
  {
    key: "receiptValidity",
    header: "Kevalidan bukti pembelanjaan (nota/kwitansi)",
    group: "verification",
    kind: "text",
  },
  {
    key: "purchasedEquipmentAvailability",
    header: "Ketersediaan alat yang dibeli",
    group: "verification",
    kind: "text",
  },
  {
    key: "purchasedMaterialAvailability",
    header: "Ketersediaan bahan yang dibeli",
    group: "verification",
    kind: "text",
  },
  {
    key: "hasActivityDocCheck",
    header: "Dokumentasi kegiatan usaha",
    group: "verification",
    kind: "text",
  },
  {
    key: "hasPurchasedItemsDocCheck",
    header: "Dokumentasi barang atau bahan yang dibeli",
    group: "verification",
    kind: "text",
  },
  {
    key: "hasBastCheck",
    header: "Berita Acara Serah Terima (BAST)",
    group: "verification",
    kind: "text",
  },
  {
    key: "hasTechnicalReportCheck",
    header: "Laporan Teknis (perkembangan usaha)",
    group: "verification",
    kind: "text",
  },
  {
    key: "bankStatementCheck",
    header:
      "Pengecekan rekening atau rekening koran untuk memastikan dana yang diberikan telah digunakan dan dibelanjakan",
    group: "verification",
    kind: "text",
  },
  {
    key: "fieldBusinessStatus",
    header: "Hasil pengecekan di lapangan terhadap keberadaan usaha",
    group: "verification",
    kind: "text",
  },

  // 8. Pertumbuhan Usaha & Pembukuan
  {
    key: "productionGrowthPercentage",
    header:
      "Berapa prosentase pertambahan produksi atau penjualan setelah mendapatkan program TKM Lanjutan?",
    group: "growth",
    kind: "percentage",
  },
  {
    key: "customerGrowthPercentage",
    header:
      "Berapa prosentase pertambahan jumlah pelanggan setelah mendapatkan program TKM Lanjutan?",
    group: "growth",
    kind: "percentage",
  },
  {
    key: "marketingAreaExpansion",
    header:
      "Apakah ada pertambahan wilayah pemasaran produk usaha setelah mendapatkan program TKM Lanjutan?",
    group: "growth",
    kind: "text",
  },
  {
    key: "revenueGrowth3Months",
    header:
      "Bagaimana pertumbuhan omset yang diperoleh selama 3 bulan ke belakang?",
    group: "growth",
    kind: "text",
  },
  {
    key: "netProfitGrowth3Months",
    header:
      "Bagaimana pertumbuhan laba bersih yang diperoleh selama 3 bulan ke belakang?",
    group: "growth",
    kind: "text",
  },
  {
    key: "hasFinancialBookkeeping",
    header: "Apakah ANDA memiliki catatan keuangan (pembukuan) usaha?",
    group: "growth",
    kind: "text",
  },

  // 9. Tenaga Kerja Saat Ini (Jangan dijumlahkan antar kolom!)
  {
    key: "currentWorkers",
    header: "Berapa jumlah tenaga kerja saat ini?",
    group: "workforce",
    kind: "integer",
  },
  {
    key: "fixedWorkers",
    header: "Jumlah Tenaga Kerja Tetap",
    group: "workforce",
    kind: "integer",
  },
  {
    key: "temporaryWorkers",
    header: "Jumlah Tenaga Kerja Tidak Tetap",
    group: "workforce",
    kind: "integer",
  },

  // 10. Pendampingan Usaha (PTN/PTS)
  {
    key: "mentoringStatus",
    header:
      "Apakah ANDA telah mendapatkan pendampingan usaha dari pendamping Perguruan Tinggi (PTN/PTS)?",
    group: "mentoring",
    kind: "text",
  },
  {
    key: "mentorNameAndUniversity",
    header: "Apabila 'Ya' sebutkan Nama Pendamping dan dari PTN/PTS apa?",
    group: "mentoring",
    kind: "text",
  },
  {
    key: "mentoringType",
    header:
      "Pendampingan seperti apa yang didapatkan oleh ANDA sebagai TKM Lanjutan?",
    group: "mentoring",
    kind: "text",
  },
  {
    key: "mentoringVisitCount",
    header:
      "Berapa kali ANDA telah mendapatkan kunjungan pendampingan usaha dari pendamping?",
    group: "mentoring",
    kind: "integer",
  },
  {
    key: "mentorCapabilityOpinion",
    header:
      "Menurut ANDA, bagaimana kemampuan Pendamping TKM Lanjutan dalam mendampingi ANDA selama menerima bantuan program TKM Lanjutan?",
    group: "mentoring",
    kind: "text",
  },
  {
    key: "mentoringBenefit",
    header:
      "Apa manfaat yang paling ANDA rasakan dari pendampingan usaha TKM Lanjutan?",
    group: "mentoring",
    kind: "text",
  },

  // 11. Dokumentasi, Tanda Tangan, Catatan & URL AppSheet
  {
    key: "docBusinessPlacePath",
    header: "Dokumentasi tempat usaha/usaha dan TKM Lanjutan",
    group: "documentation",
    kind: "text",
  },
  {
    key: "docActivityPath",
    header: "Dokumentasi kegiatan (sedang menjalankan usaha)",
    group: "documentation",
    kind: "text",
  },
  {
    key: "docProductPath",
    header: "Dokumentasi produk usaha",
    group: "documentation",
    kind: "text",
  },
  {
    key: "signaturePath",
    header: "Tanda Tangan",
    group: "documentation",
    kind: "text",
  },
  {
    key: "notes",
    header: "CATATAN",
    group: "documentation",
    kind: "text",
  },
  {
    key: "docBusinessPlaceUrl",
    header: "URL Dokumentasi tempat usaha/usaha dan TKM Lanjutan",
    group: "documentation",
    kind: "text",
  },
  {
    key: "docActivityUrl",
    header: "URL Dokumentasi kegiatan (sedang menjalankan usaha)",
    group: "documentation",
    kind: "text",
  },
  {
    key: "docProductUrl",
    header: "URL Dokumentasi produk usaha",
    group: "documentation",
    kind: "text",
  },
];

export const lpdMonevTkmColumnMapping: Record<string, string> =
  Object.fromEntries(lpdMonevTkmColumnSpecs.map((s) => [s.key, s.header]));

export const lpdMonevTkmNormalizedHeaderLookup = new Map<
  string,
  ColumnFieldSpec
>(
  lpdMonevTkmColumnSpecs.map((spec) => [
    normalizeHeaderKey(spec.header),
    spec,
  ]),
);

