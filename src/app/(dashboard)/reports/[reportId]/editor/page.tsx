import { notFound } from "next/navigation";
import { ReportEditorView } from "@/components/editor/report-editor-view";
import { HttpError, requireUser } from "@/server/permissions";
import { getReportContentData } from "@/server/services/content-service";

export default async function ReportEditorPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const data = await getReportContentData(reportId, actor);

    return (
      <ReportEditorView
        reportId={data.report.id}
        reportName={data.report.name}
        fiscalYear={data.report.fiscalYear}
        version={data.report.version}
        participantCount={data.participants.length}
        pdfCount={0}
        initialSections={data.sectionContents}
        initialNarratives={data.participantNarratives}
        participants={data.participants}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
