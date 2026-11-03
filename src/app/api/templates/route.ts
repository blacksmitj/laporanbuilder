import { type NextRequest, NextResponse } from "next/server";
import { createTemplateSchema } from "@/lib/validations/template-schema";
import { handleApiError, HttpError, requireRole, requireUser } from "@/server/permissions";
import { createTemplate, listTemplates } from "@/server/services/template-service";


export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const reportType = url.searchParams.get("reportType") ?? undefined;

    const data = await listTemplates(reportType);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = createTemplateSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data template tidak valid.",
      );
    }

    const data = await createTemplate(parsed.data, actor);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

