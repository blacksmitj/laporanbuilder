"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Activity, Clock, FileText, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AuditLogItem } from "@/server/services/audit-service";

const ACTION_LABELS: Record<string, { label: string; variant?: "default" | "secondary" | "outline" | "destructive" }> = {
  "report.created": { label: "Laporan Dibuat", variant: "default" },
  "report.updated": { label: "Laporan Diperbarui", variant: "outline" },
  "report.deleted": { label: "Laporan Dihapus", variant: "destructive" },
  "report.content_saved": { label: "Konten Disimpan", variant: "secondary" },
  "report.pdf_generated": { label: "PDF Digenerate", variant: "default" },
  "import.confirmed": { label: "Import Excel Dikonfirmasi", variant: "secondary" },
  "participants.updated": { label: "Peserta Diperbarui", variant: "outline" },
  "template.version_created": { label: "Versi Template Dibuat", variant: "outline" },
  "ai.enhanced": { label: "AI Enhance Diterapkan", variant: "secondary" },
  "user.created": { label: "Pengguna Dibuat", variant: "outline" },
  "user.updated": { label: "Pengguna Diperbarui", variant: "outline" },
  "user.deleted": { label: "Pengguna Dihapus", variant: "destructive" },
};

export function RecentActivityWidget() {
  const { data, isLoading } = useQuery<{ data: AuditLogItem[] }>({
    queryKey: ["recent-audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/audit-logs?limit=8");
      if (!res.ok) throw new Error("Gagal memuat log aktivitas.");
      return res.json();
    },
  });

  const logs = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <CardTitle className="text-base">Aktivitas Terkini (Audit Log)</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Otomatis tercatat</span>
        </div>
        <CardDescription>
          Riwayat perubahan laporan, import data, dan generasi dokumen PDF.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
            <Clock className="mb-2 size-8 text-muted-foreground/50" />
            <p>Belum ada aktivitas tercatat.</p>
          </div>
        ) : (
          <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {logs.map((log) => {
              const meta = ACTION_LABELS[log.action] ?? {
                label: log.action,
                variant: "outline" as const,
              };

              return (
                <div key={log.id} className="relative pb-4 last:pb-0">
                  <div className="absolute -left-[19px] top-1 size-2 rounded-full border-2 border-primary bg-background" />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={meta.variant} className="text-xs font-normal">
                        {meta.label}
                      </Badge>
                      {log.reportName && log.reportId && (
                        <Link
                          href={`/reports/${log.reportId}`}
                          className="flex items-center gap-1 text-xs font-medium hover:underline text-foreground truncate max-w-[240px]"
                        >
                          <FileText className="size-3 text-muted-foreground" />
                          {log.reportName}
                        </Link>
                      )}
                    </div>
                    <time className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", {
                        locale: localeId,
                      })}
                    </time>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="size-3" />
                    <span>{log.userName || log.userEmail || "Sistem"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

