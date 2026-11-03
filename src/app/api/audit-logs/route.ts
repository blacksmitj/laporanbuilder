import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, requireUser } from "@/server/permissions";
import { listAuditLogs } from "@/server/services/audit-service";


export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser();
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId") ?? undefined;
    const limit = searchParams.get("limit")
      ? Math.min(100, Math.max(1, parseInt(searchParams.get("limit")!, 10)))
      : 30;

    const logs = await listAuditLogs(actor, { reportId, limit });

    return NextResponse.json({
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

