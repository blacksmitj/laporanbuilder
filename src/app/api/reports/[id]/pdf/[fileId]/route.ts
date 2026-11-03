import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportFiles } from "@/lib/db/schema";
import { getStorageObjectBuffer } from "@/lib/storage";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { assertReportAccess } from "@/server/permissions";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, fileId } = await context.params;

    await assertReportAccess(id, actor);

    const [fileRecord] = await db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.id, fileId))
      .limit(1);

    if (!fileRecord || fileRecord.reportId !== id) {
      throw new HttpError(404, "File PDF tidak ditemukan.");
    }

    const pdfBuffer = await getStorageObjectBuffer(fileRecord.storageKey);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileRecord.filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

