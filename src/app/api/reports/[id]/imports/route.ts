import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  listReportImportBatches,
  uploadAndParseExcel,
} from "@/server/services/import-service";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const data = await listReportImportBatches(id, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new HttpError(400, "Pilih file Excel terlebih dahulu.");
    }

    const result = await uploadAndParseExcel({
      reportId: id,
      file,
      actor,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

