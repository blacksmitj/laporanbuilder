import { type NextRequest, NextResponse } from "next/server";
import { createOfficialSchema } from "@/lib/validations/official-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  createOfficial,
  listOfficials,
} from "@/server/services/official-service";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const params = request.nextUrl.searchParams;
    const search = params.get("q") ?? undefined;
    const onlyActive = params.get("active") === "true";

    const data = await listOfficials({ search, onlyActive });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser();
    const body = await request.json();
    const parsed = createOfficialSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data petugas tidak valid.",
      );
    }

    const created = await createOfficial(parsed.data, actor);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

