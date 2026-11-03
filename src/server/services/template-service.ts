import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reportTemplates } from "@/lib/db/schema";
import type {
  CreateTemplateInput,
  TemplateConfigurationInput,
  UpdateTemplateInput,
} from "@/lib/validations/template-schema";
import { getReportType, listReportTypes } from "@/report-types/registry";
import { type Actor, HttpError } from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export async function ensureDefaultTemplatesExist() {
  const registeredTypes = listReportTypes();

  for (const rType of registeredTypes) {
    const existing = await db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.reportType, rType.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(reportTemplates).values({
        name: `Template Standar ${rType.shortName}`,
        reportType: rType.key,
        description: `Template resmi standar instansi untuk ${rType.name}`,
        configuration: rType.defaultTemplate as unknown as Record<
          string,
          unknown
        >,
        isActive: true,
      });
    }
  }
}

export async function listTemplates(reportType?: string) {
  await ensureDefaultTemplatesExist();

  const conditions = [];
  if (reportType && reportType !== "all") {
    conditions.push(eq(reportTemplates.reportType, reportType));
  }

  const templates = await db
    .select()
    .from(reportTemplates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(reportTemplates.createdAt));

  return templates;
}

export async function getTemplateDetail(templateId: string) {
  const [tpl] = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.id, templateId))
    .limit(1);

  if (!tpl) {
    throw new HttpError(404, "Template tidak ditemukan.");
  }

  return tpl;
}

export async function createTemplate(
  input: CreateTemplateInput,
  actor: Actor,
) {
  const rType = getReportType(input.reportType);
  if (!rType) {
    throw new HttpError(400, "Jenis laporan tidak valid.");
  }

  const [tpl] = await db
    .insert(reportTemplates)
    .values({
      name: input.name,
      reportType: input.reportType,
      description: input.description,
      configuration: input.configuration as unknown as Record<string, unknown>,
      isActive: true,
    })
    .returning();

  await recordAuditLog({
    userId: actor.id,
    action: "template.created",
    metadata: {
      templateId: tpl.id,
      name: tpl.name,
      reportType: tpl.reportType,
    },
  });

  return tpl;
}

export async function updateTemplate(
  templateId: string,
  input: UpdateTemplateInput,
  actor: Actor,
) {
  const [tpl] = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.id, templateId))
    .limit(1);

  if (!tpl) {
    throw new HttpError(404, "Template tidak ditemukan.");
  }

  const [updated] = await db
    .update(reportTemplates)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.configuration !== undefined
        ? {
            configuration: input.configuration as unknown as Record<
              string,
              unknown
            >,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(reportTemplates.id, templateId))
    .returning();

  await recordAuditLog({
    userId: actor.id,
    action: "template.updated",
    metadata: {
      templateId,
      changes: input,
    },
  });

  return updated;
}

export async function duplicateTemplate(templateId: string, actor: Actor) {
  const source = await getTemplateDetail(templateId);

  const [duplicated] = await db
    .insert(reportTemplates)
    .values({
      name: `${source.name} (Salinan)`,
      reportType: source.reportType,
      description: source.description
        ? `Salinan dari ${source.description}`
        : `Salinan dari template ${source.name}`,
      configuration: source.configuration,
      isActive: true,
    })
    .returning();

  await recordAuditLog({
    userId: actor.id,
    action: "template.duplicated",
    metadata: {
      sourceTemplateId: source.id,
      newTemplateId: duplicated.id,
      name: duplicated.name,
    },
  });

  return duplicated;
}

export async function deleteTemplate(templateId: string, actor: Actor) {
  const [tpl] = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.id, templateId))
    .limit(1);

  if (!tpl) {
    throw new HttpError(404, "Template tidak ditemukan.");
  }

  await db.delete(reportTemplates).where(eq(reportTemplates.id, templateId));

  await recordAuditLog({
    userId: actor.id,
    action: "template.deleted",
    metadata: {
      templateId,
      name: tpl.name,
    },
  });

  return { success: true };
}
