import { z } from "zod";

export const createOfficialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama petugas minimal 2 karakter")
    .max(120, "Nama petugas maksimal 120 karakter"),
  nip: z
    .string()
    .trim()
    .min(1, "NIP wajib diisi (gunakan '-' jika tanpa NIP)")
    .max(40, "NIP maksimal 40 karakter"),
  position: z
    .string()
    .trim()
    .min(1, "Jabatan wajib diisi (gunakan '-' jika tanpa jabatan)")
    .max(120, "Jabatan maksimal 120 karakter"),
  institution: z
    .string()
    .trim()
    .min(2, "Nama unit/instansi minimal 2 karakter")
    .max(160, "Nama unit/instansi maksimal 160 karakter"),
  isActive: z.boolean().optional(),
});

export const updateOfficialSchema = createOfficialSchema.partial();

export type CreateOfficialInput = z.infer<typeof createOfficialSchema>;
export type UpdateOfficialInput = z.infer<typeof updateOfficialSchema>;

