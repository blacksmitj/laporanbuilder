import { z } from "zod";

export const confirmImportRowOverrideSchema = z.object({
  rowNumber: z.number().int().positive(),
  overrides: z.record(z.string(), z.unknown()),
});

export const confirmImportSchema = z.object({
  includeInvalidRows: z.boolean().default(false),
  autoSelectParticipants: z.boolean().default(true),
  rowOverrides: z.array(confirmImportRowOverrideSchema).optional(),
});

export type ConfirmImportInput = z.infer<typeof confirmImportSchema>;

