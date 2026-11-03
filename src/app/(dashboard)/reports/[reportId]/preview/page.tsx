import { notFound } from "next/navigation";
import { ReportPreviewView } from "@/components/pdf/report-preview-view";
import type { TemplateConfigurationInput } from "@/lib/validations/template-schema";
import { getReportType } from "@/report-types/registry";
import { HttpError, requireUser } from "@/server/permissions";
import { getReportDetail } from "@/server/services/report-service";
import { listTemplates } from "@/server/services/template-service";

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, templates] = await Promise.all([
      getReportDetail(reportId, actor),
      listTemplates(),
    ]);

    const definition = getReportType(report.reportType);
    const relevantTemplates = templates.filter(
      (t) => t.reportType === report.reportType,
    );

    const matchedTemplate =
      relevantTemplates.find((t) => t.id === report.templateId) ||
      relevantTemplates[0];

    const activeConfig =
      (matchedTemplate?.configuration as TemplateConfigurationInput) ||
      (definition?.defaultTemplate as unknown as TemplateConfigurationInput);

    return (
      <ReportPreviewView
        reportId={report.id}
        reportName={report.name}
        participantCount={report.participantCount}
        selectedParticipantCount={report.selectedParticipantCount}
        isGenerated={report.status === "generated"}
        templateId={matchedTemplate?.id ?? null}
        initialTemplateConfig={activeConfig}
        isAdmin={actor.role === "admin"}
      />
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
