import { z } from "zod";

export const templateHeaderSchema = z.object({
  showKop: z.boolean().default(true),
  ministryName: z.string().trim().min(2, "Nama Kementerian wajib diisi"),
  directorateName: z.string().trim().min(2, "Nama Direktorat Jenderal wajib diisi"),
  institutionName: z.string().trim().min(2, "Nama Balai/Instansi wajib diisi"),
  institutionAddress: z.string().trim().min(2, "Alamat Instansi wajib diisi"),
  institutionContact: z.string().trim().optional(),
  logoStorageKey: z.string().nullable().optional(),
  reportTitle: z.string().trim().min(2, "Judul Laporan wajib diisi"),
});

export const templatePageSchema = z.object({
  paperSize: z.literal("A4").default("A4"),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  fontFamily: z.string().default("Times New Roman, serif"),
  fontSizePt: z.number().min(8).max(18).default(12),
  lineHeight: z.number().min(1).max(3).default(1.5),
  marginsMm: z.object({
    top: z.number().min(5).max(60).default(25),
    right: z.number().min(5).max(60).default(25),
    bottom: z.number().min(5).max(60).default(25),
    left: z.number().min(5).max(60).default(30),
  }),
  showPageNumbers: z.boolean().default(true),
});

export const templateConfigurationSchema = z.object({
  header: templateHeaderSchema,
  page: templatePageSchema,
  enabledSections: z.array(z.string()),
  sectionOrder: z.array(z.string()),
  standardNarratives: z.record(z.string(), z.string()).default({}),
  dateFormat: z.string().default("dd MMMM yyyy"),
  currencyPrefix: z.string().default("Rp"),
  signatureCityDefault: z.string().default("Bandung Barat"),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(3, "Nama template minimal 3 karakter"),
  reportType: z.string().trim().min(1, "Jenis laporan wajib diisi"),
  description: z.string().trim().optional(),
  configuration: templateConfigurationSchema,
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(3).optional(),
  description: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const createTemplateVersionSchema = z.object({
  configuration: templateConfigurationSchema,
});

export type TemplateConfigurationInput = z.infer<
  typeof templateConfigurationSchema
>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateTemplateVersionInput = z.infer<
  typeof createTemplateVersionSchema
>;

