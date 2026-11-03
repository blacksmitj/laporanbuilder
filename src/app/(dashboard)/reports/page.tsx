import { ReportsListView } from "@/components/reports/reports-list-view";
import { requireUser } from "@/server/permissions";
import { listReports } from "@/server/services/report-service";

export default async function ReportsPage() {
  const actor = await requireUser();
  const reports = await listReports(actor);

  return (
    <ReportsListView
      initialReports={reports}
      isAdmin={actor.role === "admin"}
    />
  );
}

