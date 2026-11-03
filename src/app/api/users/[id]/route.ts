import { type NextRequest, NextResponse } from "next/server";
import { updateUserSchema } from "@/lib/validations/user-schema";
import { handleApiError, HttpError, requireRole } from "@/server/permissions";
import {
  deleteUserByAdmin,
  updateUserByAdmin,
} from "@/server/services/user-service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data perubahan tidak valid.",
      );
    }

    const updated = await updateUserByAdmin(id, parsed.data, actor);
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
    await deleteUserByAdmin(id, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

