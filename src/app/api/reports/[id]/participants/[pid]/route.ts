import { type NextRequest, NextResponse } from "next/server";
import { updateParticipantDataSchema } from "@/lib/validations/participant-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  deleteParticipant,
  getParticipantDetail,
  updateParticipantData,
} from "@/server/services/participant-service";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid } = await context.params;
    const data = await getParticipantDetail(id, pid, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid } = await context.params;
    const body = await request.json();
    const parsed = updateParticipantDataSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data peserta tidak valid.",
      );
    }

    const data = await updateParticipantData(id, pid, parsed.data, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid } = await context.params;
    await deleteParticipant(id, pid, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

