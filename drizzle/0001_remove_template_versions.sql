ALTER TABLE "report_templates" ADD COLUMN IF NOT EXISTS "configuration" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "template_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_template_version_id_report_template_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN IF EXISTS "template_version_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "report_template_versions" CASCADE;

