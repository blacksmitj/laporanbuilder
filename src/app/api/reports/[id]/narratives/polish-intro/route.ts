import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { polishIntroNarrativeWithAi } from "@/server/services/narrative-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const currentIntro = body.currentIntro;

    if (!currentIntro || typeof currentIntro !== "string") {
      throw new HttpError(400, "currentIntro wajib disertakan.");
    }

    const data = await polishIntroNarrativeWithAi(id, currentIntro, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

