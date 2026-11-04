import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { updateParticipantPhotoLink } from "@/server/services/participant-service";

const photoLinkSchema = z.object({
  photoKind: z.enum(["business", "activity"]),
  url: z.union([z.string().trim().url("Masukkan tautan foto yang valid."), z.literal("")]),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid } = await context.params;
    const parsed = photoLinkSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Tautan foto tidak valid.");
    }
    const data = await updateParticipantPhotoLink({
      reportId: id,
      participantId: pid,
      ...parsed.data,
      actor,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
