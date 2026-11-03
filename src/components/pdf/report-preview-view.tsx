"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PreviewTemplatePanel } from "@/components/pdf/preview-template-panel";
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
import { cn } from "@/lib/utils";

interface ReportPreviewViewProps {
  reportId: string;
  reportName: string;
  participantCount: number;
  selectedParticipantCount: number;
  isGenerated?: boolean;
  templateId?: string | null;
  initialTemplateConfig?: TemplateConfigurationInput | null;
  isAdmin?: boolean;
}

export function ReportPreviewView({
  reportId,
  reportName,
  participantCount,
  selectedParticipantCount,
  isGenerated = false,
  templateId = null,
  initialTemplateConfig = null,
  isAdmin = false,
}: ReportPreviewViewProps) {
  const router = useRouter();
  const [hasGenerated, setHasGenerated] = useState<boolean>(isGenerated);
  const [currentConfig, setCurrentConfig] = useState<TemplateConfigurationInput | null>(
    initialTemplateConfig,
  );

  // Live HTML state
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Debounce timer reference
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch preview HTML whenever template configuration changes
  const fetchPreviewHtml = async (
    configToUse?: TemplateConfigurationInput | null,
  ) => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      let res: Response;
      if (configToUse) {
        res = await fetch(`/api/reports/${reportId}/pdf/preview-html`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configuration: configToUse, templateId }),
        });
      } else {
        const url = templateId
          ? `/api/reports/${reportId}/pdf/preview-html?templateId=${templateId}&t=${Date.now()}`
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
    fetchPreviewHtml(currentConfig);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleConfigChange = (newConfig: TemplateConfigurationInput) => {
    setCurrentConfig(newConfig);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPreviewHtml(newConfig);
    }, 400);
  };

  const generateAndDownloadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          configuration: currentConfig,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? "Gagal men-generate PDF.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let downloadFilename = `${reportName.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          downloadFilename = match[1];
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      link.remove();

      return downloadFilename;
    },
    onSuccess: (filename) => {
      toast.add({
        title: "PDF Berhasil Diunduh",
        description: `Dokumen terkini '${filename}' berhasil di-generate dan langsung diunduh.`,
        type: "success",
      });
      setHasGenerated(true);
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
            {hasGenerated && (
              <Badge className="bg-emerald-600 gap-1 text-white">
                <CheckCircle2 className="size-3" />
                PDF Telah Diterbitkan
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Pratinjau visual HTML dokumen A4 identik dengan cetakan Playwright Chromium. Anda dapat langsung mengedit tata letak dan kop di panel kiri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={generateAndDownloadMutation.isPending}
            onClick={() => generateAndDownloadMutation.mutate()}
          >
            {generateAndDownloadMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Men-generate &amp; Mengunduh PDF...
              </>
            ) : (
              <>
                <Download className="mr-1.5 size-4" />
                Generate &amp; Unduh PDF
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
        hasPdf={hasGenerated}
      />

      {/* Grid: Kiri Pengaturan Template, Kanan Live Preview */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {currentConfig && (
          <div className="lg:col-span-5 xl:col-span-4 sticky top-4">
            <PreviewTemplatePanel
              templateId={templateId}
              config={currentConfig}
              onChange={handleConfigChange}
              isAdmin={isAdmin}
              onSaveMasterSuccess={(savedConfig) => {
                setCurrentConfig(savedConfig);
                fetchPreviewHtml(savedConfig);
              }}
            />
          </div>
        )}

        {/* Live Preview Panel Kanan */}
        <div
          className={cn(
            currentConfig ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12",
          )}
        >
          <Card className="overflow-hidden border bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-2.5 px-4">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Pratinjau Dokumen Cetak A4 (Live HTML View)
                </CardTitle>
                <CardDescription className="text-xs">
                  Merender struktur dokumen cetak A4 sesuai pengaturan kop dan halaman di sebelah kiri.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={isLoadingPreview}
                  onClick={() => fetchPreviewHtml(currentConfig)}
                >
                  {isLoadingPreview ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="size-3 mr-1" />
                  )}
                  Muat Ulang
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  disabled={generateAndDownloadMutation.isPending}
                  onClick={() => generateAndDownloadMutation.mutate()}
                >
                  {generateAndDownloadMutation.isPending ? (
                    <Loader2 className="mr-1 size-3 animate-spin" />
                  ) : (
                    <Printer className="mr-1 size-3" />
                  )}
                  Generate &amp; Unduh PDF
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
    </div>
  );
}
