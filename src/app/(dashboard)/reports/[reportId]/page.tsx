import { notFound } from "next/navigation";
import { ReportWorkspaceView } from "@/components/reports/report-workspace-view";
import { HttpError, requireUser } from "@/server/permissions";
import { listOfficials } from "@/server/services/official-service";
import { getReportDetail } from "@/server/services/report-service";
import { listTemplates } from "@/server/services/template-service";

export default async function ReportWorkspacePage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, officials, templates] = await Promise.all([
      getReportDetail(reportId, actor),
      listOfficials({ onlyActive: true }),
      listTemplates(),
    ]);

    // Ambil daftar versi template yang cocok untuk reportType laporan ini
    const relevantTemplates = templates.filter((t) => t.reportType === report.reportType);
    const availableVersions = relevantTemplates.flatMap((t) =>
      t.versions.map((v) => ({
        id: v.id,
        version: v.version,
        templateName: t.name,
        createdAt: v.createdAt,
      })),
    );

    return (
      <ReportWorkspaceView
        report={report}
        availableOfficials={officials}
        availableTemplateVersions={availableVersions}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

