import { type NextRequest, NextResponse } from "next/server";
import type { ParticipantDocumentType } from "@/lib/db/schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { uploadParticipantDocument } from "@/server/services/participant-service";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; pid: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file");
    const docType = (formData.get("documentType") as ParticipantDocumentType) || "activity";

    if (!(file instanceof File)) {
      throw new HttpError(400, "File dokumen wajib disertakan.");
    }

    const data = await uploadParticipantDocument({
      reportId: id,
      participantId: pid,
      documentType: docType,
      file,
      actor,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

