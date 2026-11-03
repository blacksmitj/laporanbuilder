"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  History,
  Loader2,
  Printer,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PreviewTemplateDialog,
  type TemplateVersionOption,
} from "@/components/pdf/preview-template-dialog";
import { ReportWizardStepper } from "@/components/reports/report-wizard-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import type { TemplateConfigurationInput } from "@/lib/validations/template-schema";

export interface ReportPdfFileItem {
  id: string;
  reportId: string;
  snapshotId: string;
  filename: string;
  fileSize: number;
  status: string;
  generatedAt: string | Date;
}

interface ReportPreviewViewProps {
  reportId: string;
  reportName: string;
  participantCount: number;
  selectedParticipantCount: number;
  initialFiles: ReportPdfFileItem[];
  currentTemplateVersionId?: string | null;
  availableTemplateVersions?: TemplateVersionOption[];
  templateId?: string | null;
  initialTemplateConfig?: TemplateConfigurationInput | null;
  isAdmin?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function ReportPreviewView({
  reportId,
  reportName,
  participantCount,
  selectedParticipantCount,
  initialFiles,
  currentTemplateVersionId = null,
  availableTemplateVersions = [],
  templateId = null,
  initialTemplateConfig = null,
  isAdmin = false,
}: ReportPreviewViewProps) {
  const router = useRouter();
  const [files, setFiles] = useState<ReportPdfFileItem[]>(initialFiles);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(
    currentTemplateVersionId,
  );
  const [versions, setVersions] = useState<TemplateVersionOption[]>(
    availableTemplateVersions,
  );
  const [currentConfig, setCurrentConfig] = useState<TemplateConfigurationInput | null>(
    initialTemplateConfig,
  );

  // Live HTML state
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fetch preview HTML whenever version or custom config changes
  const fetchPreviewHtml = async (
    configToUse?: TemplateConfigurationInput | null,
    versionIdToUse?: string | null,
  ) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      let res: Response;
      // Jika ada custom config draf hasil "Coba di Preview", gunakan POST
      if (configToUse) {
        res = await fetch(`/api/reports/${reportId}/pdf/preview-html`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configuration: configToUse }),
        });
      } else {
        const url = versionIdToUse
          ? `/api/reports/${reportId}/pdf/preview-html?templateVersionId=${versionIdToUse}&t=${Date.now()}`
          : `/api/reports/${reportId}/pdf/preview-html?t=${Date.now()}`;
        res = await fetch(url);
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? "Gagal memuat pratinjau dokumen.");
      }

      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreviewHtml(currentConfig, activeVersionId);
  }, []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateVersionId: activeVersionId,
          configuration: currentConfig,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal men-generate PDF.");
      return json.data as {
        snapshot: { id: string; version: number };
        file: ReportPdfFileItem;
      };
    },
    onSuccess: (data) => {
      toast.add({
        title: "PDF Berhasil Dibuat",
        description: `Dokumen versi #${data.snapshot.version} tersimpan ke S3 (${formatBytes(data.file.fileSize)}).`,
        type: "success",
      });
      setFiles((prev) => [data.file, ...prev]);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal membuat PDF",
        description: err.message,
        type: "error",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={<Link href={`/reports/${reportId}`} />}
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Workspace
            </Button>
            <Badge variant="outline">Tahap 5 — Preview &amp; Export PDF</Badge>
            {files.length > 0 && (
              <Badge className="bg-emerald-600 gap-1 text-white">
                <CheckCircle2 className="size-3" />
                {files.length} Versi PDF Siap
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pratinjau visual HTML dokumen A4 identik dengan cetakan Playwright
            Chromium. Anda dapat menyesuaikan template &amp; kop surat langsung dari sini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {initialTemplateConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <SlidersHorizontal className="mr-1.5 size-4" />
              Atur Template / Kop Surat
            </Button>
          )}

          <Button
            size="sm"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Men-generate PDF...
              </>
            ) : (
              <>
                <Printer className="mr-1.5 size-4" />
                Generate Dokumen PDF Final
              </>
            )}
          </Button>
        </div>
      </div>

      <ReportWizardStepper
        reportId={reportId}
        hasImportBatch={participantCount > 0}
        participantCount={participantCount}
        selectedParticipantCount={selectedParticipantCount}
        pdfCount={files.length}
      />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Riwayat Versi PDF */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="size-4" />
                Arsip Versi PDF ({files.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Tersimpan di S3/RustFS. Klik untuk mengunduh.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {files.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Belum ada PDF yang di-generate. Klik tombol di atas untuk
                  membuat PDF versi pertama.
                </div>
              ) : (
                files.map((file, idx) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Versi #{files.length - idx}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {formatBytes(file.fileSize)}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {file.filename}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(file.generatedAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                    <Button
                      size="xs"
                      variant="secondary"
                      className="mt-1 w-full gap-1.5"
                      nativeButton={false}
                      render={
                        <a
                          href={`/api/reports/${reportId}/pdf/${file.id}`}
                          download
                        />
                      }
                    >
                      <Download className="size-3.5" />
                      Unduh PDF
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Iframe */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Pratinjau Dokumen Cetak A4 (Live HTML View)
                </CardTitle>
                <CardDescription className="text-xs">
                  Merender struktur kop, tabel hasil kunjungan berlanjut, dan
                  tanda tangan sesuai template aktif.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {initialTemplateConfig && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setTemplateDialogOpen(true)}
                  >
                    <SlidersHorizontal className="mr-1 size-3" />
                    Kop Surat &amp; Layout
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="outline"
                  disabled={isLoadingPreview}
                  onClick={() => fetchPreviewHtml(currentConfig, activeVersionId)}
                >
                  {isLoadingPreview ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    "Muat Ulang Preview"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-zinc-100 dark:bg-zinc-950 flex justify-center min-h-[850px] relative">
              {isLoadingPreview && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-xs gap-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Merender pratinjau dokumen A4...
                  </p>
                </div>
              )}
              {previewError ? (
                <div className="py-20 text-center text-sm text-destructive max-w-md">
                  <p className="font-semibold">Gagal memuat pratinjau</p>
                  <p className="text-xs text-muted-foreground mt-1">{previewError}</p>
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  title="Preview Dokumen Laporan"
                  className="w-full h-[850px] border-none shadow-inner"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {initialTemplateConfig && (
        <PreviewTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          reportId={reportId}
          templateId={templateId}
          currentTemplateVersionId={activeVersionId}
          availableVersions={versions}
          initialConfig={currentConfig || initialTemplateConfig}
          isAdmin={isAdmin}
          onApplyTemporaryConfig={(newConfig) => {
            setCurrentConfig(newConfig);
            fetchPreviewHtml(newConfig, activeVersionId);
          }}
          onVersionChanged={(verId) => {
            setActiveVersionId(verId);
            setCurrentConfig(null);
            fetchPreviewHtml(null, verId);
          }}
          onConfigSaved={(newVerId, newConfig) => {
            setActiveVersionId(newVerId);
            setCurrentConfig(newConfig);
            setVersions((prev) => [
              {
                id: newVerId,
                version: prev.length + 1,
                templateName: "Template Standar",
                createdAt: new Date(),
              },
              ...prev,
            ]);
            fetchPreviewHtml(newConfig, newVerId);
          }}
        />
      )}
    </div>
  );
}
