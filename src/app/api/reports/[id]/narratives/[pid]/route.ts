import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { updateParticipantNarrative } from "@/server/services/narrative-service";


export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid } = await context.params;
    const body = await request.json();
    const narrative = body.narrative;

    if (typeof narrative !== "string") {
      throw new HttpError(400, "narrative teks wajib disertakan.");
    }

    const data = await updateParticipantNarrative(id, pid, narrative, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

