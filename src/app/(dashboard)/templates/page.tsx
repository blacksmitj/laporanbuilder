import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReportType } from "@/report-types/registry";
import { requireRole } from "@/server/permissions";
import { listTemplates } from "@/server/services/template-service";

export default async function TemplatesPage() {
  try {
    await requireRole(["admin"]);
  } catch {
    redirect("/dashboard");
  }

  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Konfigurasi Template Dokumen
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola tata letak dokumen resmi A4, kop surat kementerian/balai,
            dan riwayat versioning template.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Template Laporan</CardTitle>
          <CardDescription>
            Setiap jenis laporan memiliki template konfigurasi dokumen. Perubahan
            disimpan sebagai versi baru untuk menjamin konsistensi laporan yang
            sudah terbit sebelumnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Template</TableHead>
                <TableHead>Jenis Laporan</TableHead>
                <TableHead>Versi Aktif</TableHead>
                <TableHead>Total Versi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => {
                const def = getReportType(tpl.reportType);
                return (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/templates/${tpl.id}`}
                        className="hover:underline"
                      >
                        {tpl.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {def?.shortName ?? tpl.reportType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        v{tpl.latestVersion?.version ?? 1}
                      </Badge>
                    </TableCell>
                    <TableCell>{tpl.versions.length} Versi</TableCell>
                    <TableCell>
                      {tpl.isActive ? (
                        <Badge>Aktif</Badge>
                      ) : (
                        <Badge variant="outline">Nonaktif</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/templates/${tpl.id}`} />}
                      >
                        Konfigurasi &amp; Versi
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
