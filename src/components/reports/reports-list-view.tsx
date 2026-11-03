"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  Clock,
  ExternalLink,
  FilePlus2,
  FileSpreadsheet,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { ReportStatus } from "@/lib/db/schema";
import { getReportType, listReportTypes } from "@/report-types/registry";

export interface ReportSummarySerialized {
  id: string;
  name: string;
  reportType: string;
  definitionVersion: number;
  fiscalYear: number;
  status: ReportStatus;
  metadata: Record<string, unknown>;
  version: number;
  createdBy: string;
  creatorName: string;
  creatorEmail: string;
  participantCount: number;
  officialCount: number;
  pdfCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ReportsListViewProps {
  initialReports: ReportSummarySerialized[];
  isAdmin: boolean;
}

export function ReportsListView({
  initialReports,
  isAdmin,
}: ReportsListViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reportTypeFilter, setReportTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingReport, setDeletingReport] =
    useState<ReportSummarySerialized | null>(null);

  const reportTypes = listReportTypes();

  const reportsQuery = useQuery<ReportSummarySerialized[]>({
    queryKey: ["reports", search, reportTypeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (reportTypeFilter !== "all") params.set("reportType", reportTypeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memuat daftar laporan.");
      }
      return json.data;
    },
    initialData:
      search === "" && reportTypeFilter === "all" && statusFilter === "all"
        ? initialReports
        : undefined,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menghapus laporan.");
      }
      return json;
    },
    onSuccess: () => {
      toast.add({
        title: "Laporan dihapus",
        description: "Laporan telah berhasil dihapus.",
        type: "info",
      });
      setDeletingReport(null);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menghapus laporan",
        description: err.message,
        type: "error",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ReportStatus;
    }) => {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal mengubah status laporan.");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.add({
        title: "Status diperbarui",
        description: "Status laporan berhasil diperbarui.",
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal mengubah status",
        description: err.message,
        type: "error",
      });
    },
  });

  const list = reportsQuery.data ?? [];

  function renderStatusBadge(status: ReportStatus) {
    if (status === "generated") {
      return (
        <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
          <CheckCircle2 className="size-3" />
          Generated
        </Badge>
      );
    }
    if (status === "archived") {
      return (
        <Badge variant="secondary" className="gap-1">
          <Archive className="size-3" />
          Diarsipkan
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="size-3" />
        Draft
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Daftar &amp; Arsip Laporan
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Kelola seluruh laporan perjalanan dinas dan arsip dokumen PDF."
              : "Kelola laporan perjalanan dinas yang Anda buat."}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/reports/new" />}>
          <FilePlus2 className="mr-1.5 size-4" />
          Buat Laporan Baru
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <CardTitle>Daftar Laporan ({list.length})</CardTitle>
              <CardDescription>
                Filter berdasarkan jenis laporan, status, atau kata kunci nama
                laporan.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama laporan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              <NativeSelect
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                aria-label="Filter jenis laporan"
              >
                <NativeSelectOption value="all">
                  Semua Jenis Laporan
                </NativeSelectOption>
                {reportTypes.map((rt) => (
                  <NativeSelectOption key={rt.key} value={rt.key}>
                    {rt.shortName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <NativeSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter status laporan"
              >
                <NativeSelectOption value="all">
                  Semua Status
                </NativeSelectOption>
                <NativeSelectOption value="draft">Draft</NativeSelectOption>
                <NativeSelectOption value="generated">
                  Generated (PDF Siap)
                </NativeSelectOption>
                <NativeSelectOption value="archived">
                  Diarsipkan
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Laporan</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Nomor ST / Wilayah</TableHead>
                <TableHead>TA</TableHead>
                <TableHead>Peserta</TableHead>
                {isAdmin && <TableHead>Pembuat</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Diperbarui</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 9 : 8}
                    className="py-12 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <FileSpreadsheet className="size-8 text-muted-foreground" />
                      <p className="font-medium">Belum ada laporan</p>
                      <p className="text-xs text-muted-foreground">
                        Mulai dengan membuat laporan baru dan mengunggah file
                        Excel instrumen Monev.
                      </p>
                      <Button
                        size="sm"
                        className="mt-2"
                        nativeButton={false}
                        render={<Link href="/reports/new" />}
                      >
                        <FilePlus2 className="mr-1.5 size-4" />
                        Buat Laporan Pertama
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((report) => {
                  const typeDef = getReportType(report.reportType);
                  const stNumber =
                    (report.metadata?.assignmentLetterNumber as string) ?? "-";
                  const region =
                    (report.metadata?.region as string) ?? "-";

                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/reports/${report.id}`}
                          className="hover:underline"
                        >
                          {report.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeDef?.shortName ?? report.reportType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{stNumber}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {region}
                        </div>
                      </TableCell>
                      <TableCell>{report.fiscalYear}</TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {report.participantCount} peserta
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-xs text-muted-foreground">
                          {report.creatorName}
                        </TableCell>
                      )}
                      <TableCell>{renderStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(report.updatedAt).toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Aksi laporan</span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              render={<Link href={`/reports/${report.id}`} />}
                            >
                              <ExternalLink className="size-4" />
                              Buka Workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: report.id,
                                  status:
                                    report.status === "archived"
                                      ? "draft"
                                      : "archived",
                                })
                              }
                            >
                              <Archive className="size-4" />
                              {report.status === "archived"
                                ? "Kembalikan ke Draft"
                                : "Arsipkan Laporan"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeletingReport(report)}
                            >
                              <Trash2 className="size-4" />
                              Hapus Laporan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deletingReport)}
        onOpenChange={(open) => !open && setDeletingReport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus laporan{" "}
              <span className="font-medium text-foreground">
                {deletingReport?.name}
              </span>
              .{" "}
              {deletingReport?.status === "draft"
                ? "Seluruh dataset dan draft yang terkait akan dihapus permanen."
                : "Laporan ini telah memiliki dokumen final sehingga akan diarsipkan (soft delete)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deletingReport && deleteMutation.mutate(deletingReport.id)
              }
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

