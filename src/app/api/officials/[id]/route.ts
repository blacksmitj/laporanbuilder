import { type NextRequest, NextResponse } from "next/server";
import { updateOfficialSchema } from "@/lib/validations/official-schema";
import {
  handleApiError,
  HttpError,
  requireRole,
  requireUser,
} from "@/server/permissions";
import {
  deleteOfficial,
  updateOfficial,
} from "@/server/services/official-service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateOfficialSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data perubahan tidak valid.",
      );
    }

    const updated = await updateOfficial(id, parsed.data, actor);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    await deleteOfficial(id, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

