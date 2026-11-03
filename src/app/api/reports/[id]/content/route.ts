import { type NextRequest, NextResponse } from "next/server";
import { saveReportContentSchema } from "@/lib/validations/content-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  getReportContentData,
  saveReportContentData,
} from "@/server/services/content-service";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const data = await getReportContentData(id, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = saveReportContentSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Format data isi laporan tidak valid.",
      );
    }

    const data = await saveReportContentData(id, parsed.data, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

