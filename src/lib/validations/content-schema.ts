import { z } from "zod";

export const saveReportContentSchema = z.object({
  sectionContents: z.record(z.string(), z.record(z.string(), z.unknown())),
  participantNarratives: z.record(z.string(), z.string()).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export type SaveReportContentInput = z.infer<typeof saveReportContentSchema>;

