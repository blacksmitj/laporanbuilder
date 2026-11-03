import { notFound, redirect } from "next/navigation";
import { TemplateEditorView } from "@/components/templates/template-editor-view";
import { HttpError, requireRole } from "@/server/permissions";
import { getTemplateDetail } from "@/server/services/template-service";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  try {
    await requireRole(["admin"]);
  } catch {
    redirect("/dashboard");
  }

  const { templateId } = await params;

  try {
    const template = await getTemplateDetail(templateId);
    return <TemplateEditorView template={template} />;
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

