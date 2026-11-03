import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { enhanceNarrativeWithAi } from "@/server/services/narrative-service";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const participantId = body.participantId;

    if (!participantId) {
      throw new HttpError(400, "participantId wajib disertakan.");
    }

    const data = await enhanceNarrativeWithAi(id, participantId, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

