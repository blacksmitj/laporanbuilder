import { count, eq } from "drizzle-orm";
import {
  CheckCircle2,
  Clock,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecentActivityWidget } from "@/components/dashboard/recent-activity-widget";
import { db } from "@/lib/db";
import { reports, users } from "@/lib/db/schema";
import { buildReportScopeWhere, requireUser } from "@/server/permissions";
import { and } from "drizzle-orm";

export default async function DashboardPage() {
  const actor = await requireUser();
  const scopeWhere = buildReportScopeWhere(actor);

  const [totalResult] = await db
    .select({ value: count() })
    .from(reports)
    .where(scopeWhere);

  const [draftResult] = await db
    .select({ value: count() })
    .from(reports)
    .where(and(scopeWhere, eq(reports.status, "draft")));

  const [generatedResult] = await db
    .select({ value: count() })
    .from(reports)
    .where(and(scopeWhere, eq(reports.status, "generated")));

  const [usersResult] =
    actor.role === "admin"
      ? await db.select({ value: count() }).from(users)
      : [{ value: 0 }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Dasbor Laporan
          </h1>
          <p className="text-sm text-muted-foreground">
            {actor.role === "admin"
              ? "Ringkasan seluruh aktivitas laporan dan pengguna di sistem."
              : "Ringkasan laporan perjalanan dinas yang Anda kelola."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link href="/reports/new" />}>
            <FilePlus2 className="mr-1.5 size-4" />
            Buat Laporan Baru
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Laporan</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResult?.value ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {actor.role === "admin"
                ? "Semua laporan di sistem"
                : "Laporan milik Anda"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Draft Laporan</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftResult?.value ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Sedang dalam penyusunan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              PDF Berhasil Dibuat
            </CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {generatedResult?.value ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Siap diunduh dari arsip
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {actor.role === "admin" ? "Total Pengguna" : "Jenis Laporan Aktif"}
            </CardTitle>
            {actor.role === "admin" ? (
              <Users className="size-4 text-muted-foreground" />
            ) : (
              <FileSpreadsheet className="size-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actor.role === "admin" ? (usersResult?.value ?? 0) : 1}
            </div>
            <p className="text-xs text-muted-foreground">
              {actor.role === "admin"
                ? "Terdaftar (Admin & Operator)"
                : "LPD Monev Peserta TKM Lanjutan"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Jenis Laporan Tersedia</CardTitle>
              <CardDescription>
                Arsitektur multi-jenis laporan memungkinkan penambahan modul
                laporan baru tanpa mengubah inti aplikasi.
              </CardDescription>
            </div>
            <Badge variant="outline">MVP v1.1</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Laporan Perjalanan Dinas (LPD) Monev Peserta TKM Lanjutan
                </span>
                <Badge>Aktif</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Kode: <code>lpd-monev-tkm</code> • Sumber data: Instrumen Excel
                Monev • Output: PDF A4 Resmi
              </p>
            </div>
            <div className="flex items-center gap-2">
              {actor.role === "admin" && (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/users" />}>
                  Kelola Pengguna
                </Button>
              )}
              <Button size="sm" nativeButton={false} render={<Link href="/reports/new" />}>
                Buat Laporan LPD
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecentActivityWidget />
    </div>
  );
}

