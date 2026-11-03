import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { reports } from "./reports";
import { users } from "./users";

export const reportSnapshots = pgTable(
  "report_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    definitionVersion: integer("definition_version").default(1).notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_snapshots_report_id_idx").on(table.reportId),
    index("report_snapshots_created_at_idx").on(table.createdAt),
    uniqueIndex("report_snapshots_report_version_uidx").on(
      table.reportId,
      table.version,
    ),
  ],
);

export type ReportFileStatus = "generating" | "ready" | "failed";

export const reportFiles = pgTable(
  "report_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => reportSnapshots.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    fileSize: integer("file_size").default(0).notNull(),
    status: text("status")
      .$type<ReportFileStatus>()
      .default("ready")
      .notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_files_report_id_idx").on(table.reportId),
    index("report_files_status_idx").on(table.status),
    index("report_files_generated_at_idx").on(table.generatedAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reportId: uuid("report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_report_id_idx").on(table.reportId),
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

