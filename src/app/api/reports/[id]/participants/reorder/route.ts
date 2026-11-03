import { type NextRequest, NextResponse } from "next/server";
import { reorderReportParticipantsSchema } from "@/lib/validations/participant-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { reorderReportParticipants } from "@/server/services/participant-service";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = reorderReportParticipantsSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Urutan peserta tidak valid.",
      );
    }

    const data = await reorderReportParticipants(id, parsed.data, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

