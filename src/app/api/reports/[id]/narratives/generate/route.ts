import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import { generateRulesNarrativesForReport } from "@/server/services/narrative-service";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const participantId = body.participantId as string | undefined;

    const data = await generateRulesNarrativesForReport(id, actor, participantId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

