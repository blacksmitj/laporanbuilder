import { notFound } from "next/navigation";
import { ReportPreviewView } from "@/components/pdf/report-preview-view";
import { HttpError, requireUser } from "@/server/permissions";
import { listReportPdfFiles } from "@/server/services/pdf-service";
import { getReportDetail } from "@/server/services/report-service";
import { listTemplates } from "@/server/services/template-service";
import { getReportType } from "@/report-types/registry";
import type { TemplateConfigurationInput } from "@/lib/validations/template-schema";

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const actor = await requireUser();
  const { reportId } = await params;

  try {
    const [report, pdfFiles, templates] = await Promise.all([
      getReportDetail(reportId, actor),
      listReportPdfFiles(reportId, actor),
      listTemplates(),
    ]);

    const definition = getReportType(report.reportType);
    const relevantTemplates = templates.filter(
      (t) => t.reportType === report.reportType,
    );

    const availableVersions = relevantTemplates.flatMap((t) =>
      t.versions.map((v) => ({
        id: v.id,
        version: v.version,
        templateName: t.name,
        createdAt: v.createdAt,
      })),
    );

    // Dapatkan konfigurasi template aktif saat ini
    const primaryTemplate = relevantTemplates[0];
    const matchedVersion = relevantTemplates
      .flatMap((t) => t.versions)
      .find((v) => v.id === report.templateVersionId);

    const activeConfig =
      (matchedVersion?.configuration as TemplateConfigurationInput) ||
      (primaryTemplate?.latestVersion?.configuration as TemplateConfigurationInput) ||
      (definition?.defaultTemplate as unknown as TemplateConfigurationInput);

    return (
      <ReportPreviewView
        reportId={report.id}
        reportName={report.name}
        participantCount={report.participantCount}
        selectedParticipantCount={report.selectedParticipantCount}
        initialFiles={pdfFiles}
        currentTemplateVersionId={report.templateVersionId ?? null}
        availableTemplateVersions={availableVersions}
        templateId={primaryTemplate?.id ?? null}
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
