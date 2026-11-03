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

export const reportTemplates = pgTable(
  "report_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    reportType: text("report_type").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("report_templates_report_type_idx").on(table.reportType),
    index("report_templates_is_active_idx").on(table.isActive),
  ],
);

export const reportTemplateVersions = pgTable(
  "report_template_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => reportTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("report_template_versions_template_id_idx").on(table.templateId),
    uniqueIndex("report_template_versions_template_version_uidx").on(
      table.templateId,
      table.version,
    ),
  ],
);

