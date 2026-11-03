import { type NextRequest, NextResponse } from "next/server";
import { createTemplateVersionSchema } from "@/lib/validations/template-schema";
import { handleApiError, HttpError, requireRole } from "@/server/permissions";
import { createTemplateVersion } from "@/server/services/template-service";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = createTemplateVersionSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Konfigurasi template tidak valid.",
      );
    }

    const data = await createTemplateVersion(id, parsed.data, actor);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

