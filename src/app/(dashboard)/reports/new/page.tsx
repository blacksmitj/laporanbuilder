import { NewReportForm } from "@/components/reports/new-report-form";
import { requireUser } from "@/server/permissions";
import { listOfficials } from "@/server/services/official-service";

export default async function NewReportPage() {
  await requireUser();
  const officials = await listOfficials({ onlyActive: true });

  return <NewReportForm initialOfficials={officials} />;
}

