import { redirect } from "next/navigation";
import { OfficialsManagementView } from "@/components/reports/officials-management-view";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listReportTypes } from "@/report-types/registry";
import { requireUser } from "@/server/permissions";
import { listOfficials } from "@/server/services/official-service";

export default async function SettingsPage() {
  const actor = await requireUser();
  if (actor.role !== "admin") {
    redirect("/dashboard");
  }

  const [officials, reportTypes] = await Promise.all([
    listOfficials(),
    Promise.resolve(listReportTypes()),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pengaturan &amp; Master Data
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola master data petugas perjalanan dinas serta daftar jenis laporan
          yang terdaftar pada registry aplikasi.
        </p>
      </div>

      <OfficialsManagementView initialOfficials={officials} />

      <Card>
        <CardHeader>
          <CardTitle>Registry Jenis Laporan (Report Type Registry)</CardTitle>
          <CardDescription>
            Definisi jenis laporan yang terdaftar di{" "}
            <code>src/report-types/registry.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reportTypes.map((rt) => (
            <div
              key={rt.key}
              className="flex flex-col justify-between gap-2 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{rt.name}</span>
                  <Badge variant="outline">v{rt.version}</Badge>
                  <Badge>{rt.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rt.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Key: <code>{rt.key}</code> • Sumber data:{" "}
                  <code>{rt.dataSource}</code> • Bagian dokumen:{" "}
                  {rt.sections.map((s) => s.title).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

