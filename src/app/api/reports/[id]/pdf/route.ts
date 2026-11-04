import { type NextRequest, NextResponse } from "next/server";
import { templateConfigurationSchema } from "@/lib/validations/template-schema";
import type { TemplateConfiguration } from "@/report-types/types";
import { handleApiError, requireUser } from "@/server/permissions";
import { generateReportPdf } from "@/server/services/pdf-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId") ?? undefined;

    const { buffer, filename } = await generateReportPdf(id, actor, templateId);

    const disposition = url.searchParams.get("preview") === "true" ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
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
    let templateId: string | null | undefined = undefined;
    let overrideConfig: TemplateConfiguration | null = null;

    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        if ("templateId" in body) {
          templateId = body.templateId;
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

    const { buffer, filename } = await generateReportPdf(
      id,
      actor,
      templateId,
      overrideConfig,
    );

    const url = new URL(request.url);
    const disposition = url.searchParams.get("preview") === "true" ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
