import { z } from "zod";

const nullableText = z.string().nullable().optional();
const nullableInt = z.number().int().nullable().optional();
const nullableNum = z.number().nullable().optional();

export const lpdMonevTkmRowSchema = z.object({
  // 1. Interview & Lokasi
  sourceNo: nullableInt,
  interviewDate: z
    .string({ message: "Tanggal wawancara wajib diisi dan harus valid" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal wawancara tidak valid"),
  team: nullableText,
  disbursementDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal pencairan tidak valid")
    .nullable()
    .optional(),
  spendingPercentageLabel: nullableText,
  interviewAddress: nullableText,
  interviewVillage: nullableText,
  interviewDistrict: nullableText,
  interviewRegency: z
    .string({ message: "Kabupaten/Kota tempat wawancara wajib diisi" })
    .min(2, "Kabupaten/Kota tempat wawancara wajib diisi"),
  interviewProvince: z
    .string({ message: "Provinsi tempat wawancara wajib diisi" })
    .min(2, "Provinsi tempat wawancara wajib diisi"),

  // 2. Identitas Responden
  respondentName: z
    .string({ message: "Nama Responden wajib diisi" })
    .min(1, "Nama Responden wajib diisi"),
  nik: z
    .string({ message: "NIK Responden wajib diisi" })
    .regex(/^\d{16}$/, "NIK Responden harus terdiri dari 16 digit angka"),
  tkmId: z
    .string({ message: "ID TKM Lanjutan wajib diisi" })
    .regex(/^\d{3,20}$/, "ID TKM Lanjutan harus berupa angka"),
  gender: nullableText,
  age: nullableInt,
  education: nullableText,
  phone: nullableText,

  // 3. Profil Usaha & Keuangan Saat Ini
  sector: nullableText,
  businessType: nullableText,
  mainProduct: nullableText,
  initialWorkers: nullableInt,
  monthlyRevenue: nullableInt,
  monthlyNetProfit: nullableInt,
  marketingChannel: nullableText,
  marketingArea: nullableText,
  socialMediaPlatform: nullableText,
  socialMediaAccount: nullableText,

  // 4. Informasi Program, Pendaftaran, Seleksi & Pembekalan
  programInfoSource: nullableText,
  registrationMonthYear: nullableText,
  hasReadJuknis: nullableText,
  juknisClarityFeedback: nullableText,
  hasAccessedBizhub: nullableText,
  registeredBy: nullableText,
  registrationProcessOpinion: nullableText,
  requirementsOpinion: nullableText,
  registrationObstacle: nullableText,
  knowsSelectionProcess: nullableText,
  hardestSelectionStage: nullableText,
  processTransparencyOpinion: nullableText,
  selectionResultInfoSource: nullableText,
  briefingMode: nullableText,
  briefingBenefitOpinion: nullableText,
  otherNeedsBesidesCapital: nullableText,
  missingBriefingMaterial: nullableText,

  // 5. Pencairan Dana & Kepuasan
  hasDisbursedFund: nullableText,
  fundReceivedAmount: nullableInt,
  hasBankDisbursementObstacle: nullableText,
  bankDisbursementObstacleDetail: nullableText,
  fundSufficiencyOpinion: nullableText,
  programBenefitLevel: nullableText,
  programSatisfactionLevel: nullableText,
  programSatisfactionReason: nullableText,

  // 6. LPJ
  knowsLpjObligation: nullableText,
  hasReadLpjMechanism: nullableText,
  hasLpjWritingDifficulty: nullableText,
  lpjWritingDifficultyDetail: nullableText,
  hasLpjUploadDifficulty: nullableText,
  lpjUploadDifficultyDetail: nullableText,
  knowsSanction: nullableText,

  // 7. Verifikasi Lapangan
  rabCompliance: nullableText,
  receiptAvailability: nullableText,
  receiptValidity: nullableText,
  purchasedEquipmentAvailability: nullableText,
  purchasedMaterialAvailability: nullableText,
  hasActivityDocCheck: nullableText,
  hasPurchasedItemsDocCheck: nullableText,
  hasBastCheck: nullableText,
  hasTechnicalReportCheck: nullableText,
  bankStatementCheck: nullableText,
  fieldBusinessStatus: nullableText,

  // 8. Pertumbuhan Usaha
  productionGrowthPercentage: nullableNum,
  customerGrowthPercentage: nullableNum,
  marketingAreaExpansion: nullableText,
  revenueGrowth3Months: nullableText,
  netProfitGrowth3Months: nullableText,
  hasFinancialBookkeeping: nullableText,

  // 9. Tenaga Kerja Saat Ini
  currentWorkers: nullableInt,
  fixedWorkers: nullableInt,
  temporaryWorkers: nullableInt,

  // 10. Pendampingan Usaha
  mentoringStatus: nullableText,
  mentorNameAndUniversity: nullableText,
  mentoringType: nullableText,
  mentoringVisitCount: nullableInt,
  mentorCapabilityOpinion: nullableText,
  mentoringBenefit: nullableText,

  // 11. Dokumentasi & Catatan
  docBusinessPlacePath: nullableText,
  docActivityPath: nullableText,
  docProductPath: nullableText,
  signaturePath: nullableText,
  notes: nullableText,
  docBusinessPlaceUrl: nullableText,
  docActivityUrl: nullableText,
  docProductUrl: nullableText,
});

export type LpdMonevTkmNormalizedRow = z.infer<typeof lpdMonevTkmRowSchema>;

