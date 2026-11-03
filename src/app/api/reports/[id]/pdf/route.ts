import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import {
  generateReportPdf,
  listReportPdfFiles,
} from "@/server/services/pdf-service";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const data = await listReportPdfFiles(id, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const data = await generateReportPdf(id, actor);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

