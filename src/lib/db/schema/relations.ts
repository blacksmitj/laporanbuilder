import { relations } from "drizzle-orm";
import {
  importBatches,
  participantDocuments,
  participants,
  reportParticipants,
} from "./imports";
import {
  officials,
  reportContents,
  reportOfficials,
  reports,
} from "./reports";
import { auditLogs, reportFiles, reportSnapshots } from "./snapshots";
import { reportTemplates, reportTemplateVersions } from "./templates";
import { accounts, sessions, users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  reports: many(reports),
  snapshots: many(reportSnapshots),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const reportTemplatesRelations = relations(
  reportTemplates,
  ({ many }) => ({
    versions: many(reportTemplateVersions),
  }),
);

export const reportTemplateVersionsRelations = relations(
  reportTemplateVersions,
  ({ one, many }) => ({
    template: one(reportTemplates, {
      fields: [reportTemplateVersions.templateId],
      references: [reportTemplates.id],
    }),
    reports: many(reports),
  }),
);

export const reportsRelations = relations(reports, ({ one, many }) => ({
  creator: one(users, {
    fields: [reports.createdBy],
    references: [users.id],
  }),
  templateVersion: one(reportTemplateVersions, {
    fields: [reports.templateVersionId],
    references: [reportTemplateVersions.id],
  }),
  importBatches: many(importBatches),
  participants: many(participants),
  reportParticipants: many(reportParticipants),
  reportOfficials: many(reportOfficials),
  contents: many(reportContents),
  snapshots: many(reportSnapshots),
  files: many(reportFiles),
  auditLogs: many(auditLogs),
}));

export const officialsRelations = relations(officials, ({ many }) => ({
  reportOfficials: many(reportOfficials),
}));

export const reportOfficialsRelations = relations(
  reportOfficials,
  ({ one }) => ({
    report: one(reports, {
      fields: [reportOfficials.reportId],
      references: [reports.id],
    }),
    official: one(officials, {
      fields: [reportOfficials.officialId],
      references: [officials.id],
    }),
  }),
);

export const reportContentsRelations = relations(reportContents, ({ one }) => ({
  report: one(reports, {
    fields: [reportContents.reportId],
    references: [reports.id],
  }),
}));

export const importBatchesRelations = relations(
  importBatches,
  ({ one, many }) => ({
    report: one(reports, {
      fields: [importBatches.reportId],
      references: [reports.id],
    }),
    participants: many(participants),
  }),
);

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    report: one(reports, {
      fields: [participants.reportId],
      references: [reports.id],
    }),
    importBatch: one(importBatches, {
      fields: [participants.importBatchId],
      references: [importBatches.id],
    }),
    documents: many(participantDocuments),
    reportParticipants: many(reportParticipants),
  }),
);

export const participantDocumentsRelations = relations(
  participantDocuments,
  ({ one }) => ({
    participant: one(participants, {
      fields: [participantDocuments.participantId],
      references: [participants.id],
    }),
  }),
);

export const reportParticipantsRelations = relations(
  reportParticipants,
  ({ one }) => ({
    report: one(reports, {
      fields: [reportParticipants.reportId],
      references: [reports.id],
    }),
    participant: one(participants, {
      fields: [reportParticipants.participantId],
      references: [participants.id],
    }),
  }),
);

export const reportSnapshotsRelations = relations(
  reportSnapshots,
  ({ one, many }) => ({
    report: one(reports, {
      fields: [reportSnapshots.reportId],
      references: [reports.id],
    }),
    creator: one(users, {
      fields: [reportSnapshots.createdBy],
      references: [users.id],
    }),
    files: many(reportFiles),
  }),
);

export const reportFilesRelations = relations(reportFiles, ({ one }) => ({
  report: one(reports, {
    fields: [reportFiles.reportId],
    references: [reports.id],
  }),
  snapshot: one(reportSnapshots, {
    fields: [reportFiles.snapshotId],
    references: [reportSnapshots.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  report: one(reports, {
    fields: [auditLogs.reportId],
    references: [reports.id],
  }),
}));

