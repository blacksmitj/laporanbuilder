import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import { getReportHtmlPreview } from "@/server/services/pdf-service";


export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const html = await getReportHtmlPreview(id, actor);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

