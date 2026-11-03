import {
  boolean,
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

export type ImportBatchStatus =
  | "uploaded"
  | "parsed"
  | "confirmed"
  | "failed"
  | "superseded";

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    storageKey: text("storage_key").notNull(),
    status: text("status")
      .$type<ImportBatchStatus>()
      .default("uploaded")
      .notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    successfulRows: integer("successful_rows").default(0).notNull(),
    failedRows: integer("failed_rows").default(0).notNull(),
    validationSummary: jsonb("validation_summary")
      .$type<Record<string, unknown>>()
      .default({}),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("import_batches_report_id_idx").on(table.reportId),
    index("import_batches_status_idx").on(table.status),
    index("import_batches_imported_at_idx").on(table.importedAt),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    importBatchId: uuid("import_batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    rawData: jsonb("raw_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    normalizedData: jsonb("normalized_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("participants_report_id_idx").on(table.reportId),
    index("participants_import_batch_id_idx").on(table.importBatchId),
    index("participants_created_at_idx").on(table.createdAt),
  ],
);

export type ParticipantDocumentType =
  | "business"
  | "activity"
  | "product"
  | "signature"
  | "other";

export const participantDocuments = pgTable(
  "participant_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    documentType: text("document_type")
      .$type<ParticipantDocumentType>()
      .notNull(),
    originalFilename: text("original_filename").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("participant_documents_participant_id_idx").on(table.participantId),
  ],
);

export const reportParticipants = pgTable(
  "report_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    visitDate: text("visit_date"),
    rulesNarrative: text("rules_narrative"),
    aiNarrative: text("ai_narrative"),
    narrative: text("narrative"),
    aiMetadata: jsonb("ai_metadata").$type<{
      model?: string;
      promptVersion?: string;
      durationMs?: number;
      generatedAt?: string;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("report_participants_report_id_idx").on(table.reportId),
    index("report_participants_participant_id_idx").on(table.participantId),
    uniqueIndex("report_participants_report_participant_uidx").on(
      table.reportId,
      table.participantId,
    ),
  ],
);

