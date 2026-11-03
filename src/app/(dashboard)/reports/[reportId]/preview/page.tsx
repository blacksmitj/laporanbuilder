import { notFound } from "next/navigation";
import { ReportPreviewView } from "@/components/pdf/report-preview-view";
import { HttpError, requireUser } from "@/server/permissions";
import { listReportPdfFiles } from "@/server/services/pdf-service";
import { getReportDetail } from "@/server/services/report-service";

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, pdfFiles] = await Promise.all([
      getReportDetail(reportId, actor),
      listReportPdfFiles(reportId, actor),
    ]);

    return (
      <ReportPreviewView
        reportId={report.id}
        reportName={report.name}
        participantCount={report.participantCount}
        selectedParticipantCount={report.selectedParticipantCount}
        initialFiles={pdfFiles}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
