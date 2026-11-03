import { type NextRequest, NextResponse } from "next/server";
import { updateReportSchema } from "@/lib/validations/report-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  deleteReport,
  getReportDetail,
  updateReport,
} from "@/server/services/report-service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const data = await getReportDetail(id, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data perubahan tidak valid.",
      );
    }

    const updated = await updateReport(id, parsed.data, actor);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    await deleteReport(id, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

