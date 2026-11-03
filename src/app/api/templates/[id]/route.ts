import { type NextRequest, NextResponse } from "next/server";
import { updateTemplateSchema } from "@/lib/validations/template-schema";
import { handleApiError, HttpError, requireRole, requireUser } from "@/server/permissions";
import { getTemplateDetail, updateTemplate } from "@/server/services/template-service";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
    const { id } = await context.params;
    const data = await getTemplateDetail(id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data pembaruan template tidak valid.",
      );
    }

    const data = await updateTemplate(id, parsed.data, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

