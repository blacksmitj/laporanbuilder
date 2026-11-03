import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const reportTemplates = pgTable(
  "report_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    reportType: text("report_type").notNull(),
    description: text("description"),
    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
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
