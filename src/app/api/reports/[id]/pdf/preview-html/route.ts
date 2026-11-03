import { type NextRequest, NextResponse } from "next/server";
import { templateConfigurationSchema } from "@/lib/validations/template-schema";
import type { TemplateConfiguration } from "@/report-types/types";
import { handleApiError, requireUser } from "@/server/permissions";
import { getReportPreviewHtml } from "@/server/services/pdf-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId");

    const html = await getReportPreviewHtml(
      id,
      actor,
      templateId !== null ? templateId : undefined,
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
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
    const body = await request.json();

    let overrideConfig: TemplateConfiguration | null = null;
    let templateId: string | null | undefined = undefined;

    if (body?.templateId) {
      templateId = body.templateId;
    }

    if (body?.configuration) {
      const parsed = templateConfigurationSchema.safeParse(body.configuration);
      if (parsed.success) {
        overrideConfig = parsed.data as unknown as TemplateConfiguration;
      }
    }

    const html = await getReportPreviewHtml(
      id,
      actor,
      templateId,
      overrideConfig,
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
