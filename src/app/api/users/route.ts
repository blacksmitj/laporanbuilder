import { type NextRequest, NextResponse } from "next/server";
import { createUserSchema } from "@/lib/validations/user-schema";
import { handleApiError, HttpError, requireRole } from "@/server/permissions";
import {
  createUserByAdmin,
  listUsers,
} from "@/server/services/user-service";

export async function GET(request: NextRequest) {
  try {
    await requireRole(["admin"]);
    const search = request.nextUrl.searchParams.get("q") ?? undefined;
    const data = await listUsers(search);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRole(["admin"]);
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data pengguna tidak valid.",
      );
    }

    const user = await createUserByAdmin(parsed.data, actor);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

