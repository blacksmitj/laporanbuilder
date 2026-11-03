import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireRole } from "@/server/permissions";
import { duplicateTemplate } from "@/server/services/template-service";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const data = await duplicateTemplate(id, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

