import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import { getReportHtmlPreview } from "@/server/services/pdf-service";
import { templateConfigurationSchema } from "@/lib/validations/template-schema";
import type { TemplateConfiguration } from "@/report-types/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const url = new URL(request.url);
    const templateVersionId = url.searchParams.get("templateVersionId");

    const html = await getReportHtmlPreview(
      id,
      actor,
      templateVersionId !== null ? templateVersionId : undefined,
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
    if (body?.configuration) {
      const parsed = templateConfigurationSchema.safeParse(body.configuration);
      if (parsed.success) {
        overrideConfig = parsed.data as unknown as TemplateConfiguration;
      }
    }

    const html = await getReportHtmlPreview(
      id,
      actor,
      undefined,
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
