import { notFound } from "next/navigation";
import { ParticipantsManagementView } from "@/components/participants/participants-management-view";
import { HttpError, requireUser } from "@/server/permissions";
import { listParticipants } from "@/server/services/participant-service";
import { getReportDetail } from "@/server/services/report-service";

export default async function ReportParticipantsPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, participantsData] = await Promise.all([
      getReportDetail(reportId, actor),
      listParticipants(reportId, actor),
    ]);

    return (
      <ParticipantsManagementView
        reportId={report.id}
        reportName={report.name}
        initialParticipants={participantsData.participants}
        availableTeams={participantsData.availableTeams}
        availableRegencies={participantsData.availableRegencies}
        pdfCount={report.files.length}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
