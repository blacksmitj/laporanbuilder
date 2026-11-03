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
  titleFontFamily: z.string().optional().default("Arial, sans-serif"),
  titleFontSizePt: z.number().min(8).max(24).optional().default(11),
  titleFontWeight: z.enum(["normal", "bold", "500", "600"]).optional().default("bold"),
  titleLetterSpacing: z.string().optional().default("0.5px"),

  // Tipografi Judul Kop / Cover Atas
  ministryFontFamily: z.string().optional().default("Arial, sans-serif"),
  ministryFontSizePt: z.number().min(7).max(24).optional().default(10.5),
  ministryFontWeight: z.enum(["normal", "bold", "500", "600"]).optional().default("normal"),
  directorateFontFamily: z.string().optional().default("Arial, sans-serif"),
  directorateFontSizePt: z.number().min(7).max(24).optional().default(10),
  directorateFontWeight: z.enum(["normal", "bold", "500", "600"]).optional().default("bold"),
  institutionFontFamily: z.string().optional().default("Arial, sans-serif"),
  institutionFontSizePt: z.number().min(7).max(24).optional().default(12.5),
  institutionFontWeight: z.enum(["normal", "bold", "500", "600"]).optional().default("bold"),

  // Margin Khusus Kop Surat (Lebih wide & rapat ke tepi kertas dibanding body)
  kopMarginsMm: z
    .object({
      top: z.number().min(0).max(60).default(15),
      left: z.number().min(0).max(60).default(15),
      right: z.number().min(0).max(60).default(15),
    })
    .optional()
    .default({
      top: 15,
      left: 15,
      right: 15,
    }),
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

