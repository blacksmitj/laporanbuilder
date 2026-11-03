import { type NextRequest, NextResponse } from "next/server";
import { confirmImportSchema } from "@/lib/validations/import-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { confirmImportBatch } from "@/server/services/import-service";


export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; batchId: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, batchId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = confirmImportSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data konfirmasi tidak valid.",
      );
    }

    const result = await confirmImportBatch({
      reportId: id,
      batchId,
      input: parsed.data,
      actor,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

