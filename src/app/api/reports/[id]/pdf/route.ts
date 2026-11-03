import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import {
  generateReportPdf,
  listReportPdfFiles,
} from "@/server/services/pdf-service";
import { templateConfigurationSchema } from "@/lib/validations/template-schema";
import type { TemplateConfiguration } from "@/report-types/types";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const data = await listReportPdfFiles(id, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    let templateVersionId: string | null | undefined = undefined;
    let overrideConfig: TemplateConfiguration | null = null;

    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        if ("templateVersionId" in body) {
          templateVersionId = body.templateVersionId;
        }
        if ("configuration" in body && body.configuration) {
          const parsed = templateConfigurationSchema.safeParse(body.configuration);
          if (parsed.success) {
            overrideConfig = parsed.data as unknown as TemplateConfiguration;
          }
        }
      }
    } catch {
      // Body might be empty for simple POST
    }

    const data = await generateReportPdf(
      id,
      actor,
      templateVersionId,
      overrideConfig,
    );
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
