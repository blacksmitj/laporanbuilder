import { lpdMonevTkmColumnMapping } from "./column-mapping";
import {
  defaultLpdMonevTkmTemplate,
  lpdMonevTkmSections,
} from "./default-template";
import {
  defaultLpdMonevTkmMetadata,
  type LpdMonevTkmMetadata,
  lpdMonevTkmMetadataFields,
  lpdMonevTkmMetadataSchema,
} from "./metadata-schema";
import { buildLpdParticipantRulesNarrative } from "./narrative-rules";
import {
  type LpdMonevTkmNormalizedRow,
  lpdMonevTkmRowSchema,
} from "./row-schema";
import type { ReportTypeDefinition } from "../types";

export const lpdMonevTkmDefinition: ReportTypeDefinition<
  LpdMonevTkmMetadata,
  LpdMonevTkmNormalizedRow
> = {
  key: "lpd-monev-tkm",
  name: "Laporan Perjalanan Dinas (LPD) Monev Peserta TKM Lanjutan",
  shortName: "LPD Monev TKM Lanjutan",
  description:
    "Laporan formal hasil perjalanan dinas monitoring dan evaluasi penerima bantuan Tenaga Kerja Mandiri (TKM) Lanjutan berdasarkan instrumen Excel lapangan.",
  version: 1,
  isActive: true,
  dataSource: "excel",
  metadataSchema: lpdMonevTkmMetadataSchema,
  defaultMetadata: defaultLpdMonevTkmMetadata,
  metadataFields: lpdMonevTkmMetadataFields,
  rowSchema: lpdMonevTkmRowSchema,
  columnMapping: lpdMonevTkmColumnMapping,
  sections: lpdMonevTkmSections,
  narrativeRules: [
    {
      id: "lpd-standard-rule",
      label: "Aturan Standar Narasi Kunjungan TKM Lanjutan",
      build: (row) => buildLpdParticipantRulesNarrative(row),
    },
  ],
  aiPromptConfig: {
    version: "1.0",
    systemPrompt:
      "Anda adalah asisten redaksi laporan kedinasan Kementerian Ketenagakerjaan RI. Tugas Anda adalah memperhalus struktur kalimat narasi hasil pemantauan lapangan agar baku, ringkas, dan formal, tanpa pernah mengarang fakta, menambah klaim tanpa data, atau mengubah angka Rupiah/tenaga kerja.",
    style: "formal_official_report",
    constraints: [
      "Do not invent facts",
      "Preserve all numbers and currency amounts exactly",
      "Do not infer missing values",
      "Do not change the factual meaning",
      "Write in formal Indonesian (Bahasa Indonesia baku tata bahasa kedinasan)",
    ],
    allowedFactKeys: [
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
    ],
  },
  defaultTemplate: defaultLpdMonevTkmTemplate,
};
