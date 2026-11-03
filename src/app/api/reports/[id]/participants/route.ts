import { type NextRequest, NextResponse } from "next/server";
import { updateReportParticipantsSelectionSchema } from "@/lib/validations/participant-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  listParticipants,
  updateReportParticipantsSelection,
} from "@/server/services/participant-service";


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const url = new URL(request.url);

    const search = url.searchParams.get("q") ?? undefined;
    const team = url.searchParams.get("team") ?? undefined;
    const regency = url.searchParams.get("regency") ?? undefined;
    const selectedOnly = url.searchParams.get("selectedOnly") === "true";

    const data = await listParticipants(id, actor, {
      search,
      team,
      regency,
      selectedOnly,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateReportParticipantsSelectionSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data pilihan peserta tidak valid.",
      );
    }

    const result = await updateReportParticipantsSelection(id, parsed.data, actor);
    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

