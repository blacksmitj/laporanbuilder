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
import { reportTemplateVersions } from "./templates";
import { users } from "./users";

export type ReportStatus = "draft" | "generated" | "archived";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    reportType: text("report_type").notNull(),
    definitionVersion: integer("definition_version").default(1).notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    status: text("status").$type<ReportStatus>().default("draft").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    templateVersionId: uuid("template_version_id").references(
      () => reportTemplateVersions.id,
      { onDelete: "set null" },
    ),
    version: integer("version").default(1).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reports_status_idx").on(table.status),
    index("reports_report_type_idx").on(table.reportType),
    index("reports_created_by_idx").on(table.createdBy),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

export const officials = pgTable(
  "officials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    nip: text("nip").notNull(),
    position: text("position").notNull(),
    institution: text("institution").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("officials_nip_idx").on(table.nip)],
);

export const reportOfficials = pgTable(
  "report_officials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    officialId: uuid("official_id")
      .notNull()
      .references(() => officials.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").default(0).notNull(),
    signingEnabled: boolean("signing_enabled").default(true).notNull(),
  },
  (table) => [
    index("report_officials_report_id_idx").on(table.reportId),
    uniqueIndex("report_officials_report_official_uidx").on(
      table.reportId,
      table.officialId,
    ),
  ],
);

export const reportContents = pgTable(
  "report_contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    content: jsonb("content")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    version: integer("version").default(1).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("report_contents_report_id_idx").on(table.reportId),
    uniqueIndex("report_contents_report_section_uidx").on(
      table.reportId,
      table.sectionKey,
    ),
  ],
);

