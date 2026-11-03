import { type NextRequest, NextResponse } from "next/server";
import type { ReportStatus } from "@/lib/db/schema";
import { createReportSchema } from "@/lib/validations/report-schema";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  createReport,
  listReports,
} from "@/server/services/report-service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireUser();
    const params = request.nextUrl.searchParams;
    const search = params.get("q") ?? undefined;
    const reportType = params.get("reportType") ?? undefined;
    const statusParam = params.get("status") ?? undefined;
    const fiscalYearParam = params.get("fiscalYear");

    const status =
      statusParam === "draft" ||
      statusParam === "generated" ||
      statusParam === "archived"
        ? (statusParam as ReportStatus)
        : undefined;

    const fiscalYear = fiscalYearParam ? Number(fiscalYearParam) : undefined;

    const data = await listReports(actor, {
      search,
      reportType,
      status,
      fiscalYear: Number.isFinite(fiscalYear) ? fiscalYear : undefined,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser();
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Data laporan tidak valid.",
      );
    }

    const created = await createReport(parsed.data, actor);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

