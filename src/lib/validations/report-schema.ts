import { z } from "zod";

export const reportStatusSchema = z.enum(["draft", "generated", "archived"]);

export const reportOfficialAssignmentSchema = z.object({
  officialId: z.string().uuid("ID petugas tidak valid"),
  sortOrder: z.number().int().min(0).default(0),
  signingEnabled: z.boolean().default(true),
});

export const createReportSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama laporan minimal 3 karakter")
    .max(200, "Nama laporan maksimal 200 karakter"),
  reportType: z.string().trim().min(1, "Jenis laporan wajib dipilih"),
  fiscalYear: z
    .number()
    .int()
    .min(2020, "Tahun anggaran minimal 2020")
    .max(2100, "Tahun anggaran maksimal 2100"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  officialIds: z
    .array(z.string().uuid("ID petugas tidak valid"))
    .min(1, "Pilih minimal 1 petugas")
    .optional(),
  officials: z.array(reportOfficialAssignmentSchema).optional(),
});

export const updateReportSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Nama laporan minimal 3 karakter")
    .max(200, "Nama laporan maksimal 200 karakter")
    .optional(),
  fiscalYear: z
    .number()
    .int()
    .min(2020, "Tahun anggaran minimal 2020")
    .max(2100, "Tahun anggaran maksimal 2100")
    .optional(),
  status: reportStatusSchema.optional(),
  templateId: z.string().uuid("ID template tidak valid").nullable().optional(),
  templateVersionId: z.string().uuid("ID template tidak valid").nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  officials: z.array(reportOfficialAssignmentSchema).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ReportOfficialAssignment = z.infer<
  typeof reportOfficialAssignmentSchema
>;
