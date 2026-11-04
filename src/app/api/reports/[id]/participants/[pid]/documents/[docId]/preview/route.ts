import { and, eq } from "drizzle-orm";
import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { participantDocuments, participants } from "@/lib/db/schema";
import { getStorageObjectBuffer } from "@/lib/storage";
import { assertReportAccess, handleApiError, HttpError, requireUser } from "@/server/permissions";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; pid: string; docId: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, pid, docId } = await context.params;
    await assertReportAccess(id, actor);

    const [document] = await db
      .select({
        id: participantDocuments.id,
        participantId: participantDocuments.participantId,
        storageKey: participantDocuments.storageKey,
        mimeType: participantDocuments.mimeType,
      })
      .from(participantDocuments)
      .innerJoin(participants, eq(participantDocuments.participantId, participants.id))
      .where(
        and(
          eq(participantDocuments.id, docId),
          eq(participantDocuments.participantId, pid),
          eq(participants.id, pid),
          eq(participants.reportId, id),
        ),
      )
      .limit(1);

    if (!document) throw new HttpError(404, "Foto peserta tidak ditemukan.");
    if (!allowedImageTypes.has(document.mimeType)) {
      throw new HttpError(415, "File ini bukan format foto yang didukung.");
    }

    const buffer = await getStorageObjectBuffer(document.storageKey);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
