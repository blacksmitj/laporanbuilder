import { z } from "zod";
import type { MetadataFieldDescriptor } from "../types";

export const lpdMonevTkmMetadataSchema = z.object({
  recipient: z
    .string()
    .trim()
    .min(2, "Tujuan laporan (Kepada Yth.) wajib diisi"),
  sender: z
    .string()
    .trim()
    .min(2, "Pengirim laporan (Dari) wajib diisi"),
  subject: z
    .string()
    .trim()
    .min(3, "Perihal laporan wajib diisi"),
  assignmentLetterNumber: z
    .string()
    .trim()
    .min(3, "Nomor Surat Tugas wajib diisi"),
  assignmentLetterDate: z
    .string()
    .trim()
    .min(1, "Tanggal Surat Tugas wajib diisi"),
  startDate: z
    .string()
    .trim()
    .min(1, "Tanggal mulai pelaksanaan wajib diisi"),
  endDate: z
    .string()
    .trim()
    .min(1, "Tanggal selesai pelaksanaan wajib diisi"),
  region: z
    .string()
    .trim()
    .min(2, "Wilayah monitoring (Kabupaten/Kota/Provinsi) wajib diisi"),
  signCity: z
    .string()
    .trim()
    .min(2, "Kota penandatanganan wajib diisi"),
  signDate: z
    .string()
    .trim()
    .min(1, "Tanggal penandatanganan laporan wajib diisi"),
});

export type LpdMonevTkmMetadata = z.infer<typeof lpdMonevTkmMetadataSchema>;

const todayIso = () => new Date().toISOString().slice(0, 10);

export const defaultLpdMonevTkmMetadata: LpdMonevTkmMetadata = {
  recipient: "Kepala Balai Besar Perluasan Kesempatan Kerja Bandung Barat",
  sender: "Tim Monitoring dan Evaluasi TKM Lanjutan",
  subject:
    "Laporan Perjalanan Dinas Monitoring dan Evaluasi Peserta TKM Lanjutan",
  assignmentLetterNumber: "",
  assignmentLetterDate: todayIso(),
  startDate: todayIso(),
  endDate: todayIso(),
  region: "",
  signCity: "Bandung Barat",
  signDate: todayIso(),
};

export const lpdMonevTkmMetadataFields: MetadataFieldDescriptor[] = [
  {
    name: "recipient",
    label: "Kepada Yth.",
    type: "text",
    placeholder: "Kepala Balai Besar Perluasan Kesempatan Kerja...",
    required: true,
    colSpan: 1,
  },
  {
    name: "sender",
    label: "Dari",
    type: "text",
    placeholder: "Petugas / Tim Monitoring dan Evaluasi",
    required: true,
    colSpan: 1,
  },
  {
    name: "subject",
    label: "Perihal",
    type: "text",
    placeholder: "Laporan Perjalanan Dinas Monitoring dan Evaluasi...",
    required: true,
    colSpan: 2,
  },
  {
    name: "assignmentLetterNumber",
    label: "Nomor Surat Tugas (ST)",
    type: "text",
    placeholder: "Contoh: 5/1234/PK.03.01/X/2026",
    required: true,
    colSpan: 1,
  },
  {
    name: "assignmentLetterDate",
    label: "Tanggal Surat Tugas",
    type: "date",
    required: true,
    colSpan: 1,
  },
  {
    name: "startDate",
    label: "Tanggal Mulai Pelaksanaan",
    type: "date",
    required: true,
    colSpan: 1,
  },
  {
    name: "endDate",
    label: "Tanggal Selesai Pelaksanaan",
    type: "date",
    required: true,
    colSpan: 1,
  },
  {
    name: "region",
    label: "Wilayah Monitoring (Kabupaten/Kota & Provinsi)",
    type: "text",
    placeholder: "Contoh: Kabupaten Aceh Besar, Provinsi Aceh",
    required: true,
    colSpan: 2,
  },
  {
    name: "signCity",
    label: "Tempat Penandatanganan Laporan",
    type: "text",
    placeholder: "Contoh: Bandung Barat",
    required: true,
    colSpan: 1,
  },
  {
    name: "signDate",
    label: "Tanggal Laporan",
    type: "date",
    required: true,
    colSpan: 1,
  },
];

