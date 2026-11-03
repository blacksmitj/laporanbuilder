import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import { getImportBatchPreview } from "@/server/services/import-service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; batchId: string }> },
) {
  try {
    const actor = await requireUser();
    const { id, batchId } = await context.params;
    const data = await getImportBatchPreview(id, batchId, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

