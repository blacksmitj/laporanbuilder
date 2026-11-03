import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  reportTemplates,
  reportTemplateVersions,
} from "@/lib/db/schema";
import type {
  CreateTemplateInput,
  CreateTemplateVersionInput,
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
      await db.transaction(async (tx) => {
        const [tpl] = await tx
          .insert(reportTemplates)
          .values({
            name: `Template Standar ${rType.shortName}`,
            reportType: rType.key,
            description: `Template resmi standar instansi untuk ${rType.name}`,
            isActive: true,
          })
          .returning();

        await tx.insert(reportTemplateVersions).values({
          templateId: tpl.id,
          version: 1,
          configuration: rType.defaultTemplate as unknown as Record<
            string,
            unknown
          >,
        });
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

  const templateIds = templates.map((t) => t.id);
  if (templateIds.length === 0) return [];

  const versions = await db
    .select()
    .from(reportTemplateVersions)
    .orderBy(desc(reportTemplateVersions.version));

  const versionsMap = new Map<string, typeof reportTemplateVersions.$inferSelect[]>();
  for (const v of versions) {
    const arr = versionsMap.get(v.templateId) || [];
    arr.push(v);
    versionsMap.set(v.templateId, arr);
  }

  return templates.map((tpl) => {
    const tplVersions = versionsMap.get(tpl.id) || [];
    const latestVersion = tplVersions[0] || null;
    return {
      ...tpl,
      versions: tplVersions,
      latestVersion,
    };
  });
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

  const versions = await db
    .select()
    .from(reportTemplateVersions)
    .where(eq(reportTemplateVersions.templateId, templateId))
    .orderBy(desc(reportTemplateVersions.version));

  return {
    ...tpl,
    versions,
    latestVersion: versions[0] || null,
  };
}

export async function createTemplate(
  input: CreateTemplateInput,
  actor: Actor,
) {
  const rType = getReportType(input.reportType);
  if (!rType) {
    throw new HttpError(400, "Jenis laporan tidak valid.");
  }

  const created = await db.transaction(async (tx) => {
    const [tpl] = await tx
      .insert(reportTemplates)
      .values({
        name: input.name,
        reportType: input.reportType,
        description: input.description,
        isActive: true,
      })
      .returning();

    const [ver] = await tx
      .insert(reportTemplateVersions)
      .values({
        templateId: tpl.id,
        version: 1,
        configuration: input.configuration as unknown as Record<
          string,
          unknown
        >,
      })
      .returning();

    return {
      ...tpl,
      versions: [ver],
      latestVersion: ver,
    };
  });

  await recordAuditLog({
    userId: actor.id,
    action: "template.created",
    metadata: {
      templateId: created.id,
      name: created.name,
      reportType: created.reportType,
    },
  });

  return created;
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

export async function createTemplateVersion(
  templateId: string,
  input: CreateTemplateVersionInput,
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

  const latestVersions = await db
    .select({ version: reportTemplateVersions.version })
    .from(reportTemplateVersions)
    .where(eq(reportTemplateVersions.templateId, templateId))
    .orderBy(desc(reportTemplateVersions.version))
    .limit(1);

  const nextVersionNumber = (latestVersions[0]?.version ?? 0) + 1;

  const [newVersion] = await db
    .insert(reportTemplateVersions)
    .values({
      templateId,
      version: nextVersionNumber,
      configuration: input.configuration as unknown as Record<
        string,
        unknown
      >,
    })
    .returning();

  await recordAuditLog({
    userId: actor.id,
    action: "template_version.created",
    metadata: {
      templateId,
      version: nextVersionNumber,
    },
  });

  return newVersion;
}

