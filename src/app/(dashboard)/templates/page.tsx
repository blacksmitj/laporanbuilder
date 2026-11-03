import Link from "next/link";
import { redirect } from "next/navigation";
import { TemplateListActions } from "@/components/templates/template-list-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
            dan konfigurasi cetak dokumen.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Template Laporan</CardTitle>
          <CardDescription>
            Setiap item template mengatur konfigurasi tata letak laporan. Anda
            dapat mengedit template secara langsung atau menduplikatnya untuk
            membuat variasi template baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Template</TableHead>
                <TableHead>Jenis Laporan</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-6 text-muted-foreground"
                  >
                    Belum ada template yang tersedia.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((tpl) => {
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
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {tpl.description || "-"}
                      </TableCell>
                      <TableCell>
                        {tpl.isActive ? (
                          <Badge>Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TemplateListActions templateId={tpl.id} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
