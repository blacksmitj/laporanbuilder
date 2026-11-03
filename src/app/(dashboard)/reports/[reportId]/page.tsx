import { notFound } from "next/navigation";
import { ReportWorkspaceView } from "@/components/reports/report-workspace-view";
import { HttpError, requireUser } from "@/server/permissions";
import { listOfficials } from "@/server/services/official-service";
import { getReportDetail } from "@/server/services/report-service";

export default async function ReportWorkspacePage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, officials] = await Promise.all([
      getReportDetail(reportId, actor),
      listOfficials({ onlyActive: true }),
    ]);

    return (
      <ReportWorkspaceView
        report={report}
        availableOfficials={officials}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

