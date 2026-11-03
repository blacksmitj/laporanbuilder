import { z } from "zod";

export const updateParticipantDataSchema = z.object({
  normalizedData: z.record(z.string(), z.unknown()),
});

export const updateReportParticipantsSelectionSchema = z.object({
  selectedParticipantIds: z.array(z.string().uuid()),
});

export const reorderReportParticipantsSchema = z.object({
  orderedParticipantIds: z.array(z.string().uuid()),
});

export const updateParticipantVisitDateSchema = z.object({
  visitDate: z.string().nullable().optional(),
});

export type UpdateParticipantDataInput = z.infer<
  typeof updateParticipantDataSchema
>;
export type UpdateReportParticipantsSelectionInput = z.infer<
  typeof updateReportParticipantsSelectionSchema
>;
export type ReorderReportParticipantsInput = z.infer<
  typeof reorderReportParticipantsSchema
>;
export type UpdateParticipantVisitDateInput = z.infer<
  typeof updateParticipantVisitDateSchema
>;

