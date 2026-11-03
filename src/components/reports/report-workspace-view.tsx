"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DynamicMetadataFields } from "@/components/reports/dynamic-metadata-fields";
import {
  type OfficialItem,
  OfficialsSelector,
} from "@/components/reports/officials-selector";
import { ReportWizardStepper } from "@/components/reports/report-wizard-stepper";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toast } from "@/components/ui/toast";
import type { ReportStatus } from "@/lib/db/schema";
import type { ReportOfficialAssignment } from "@/lib/validations/report-schema";
import { requireReportType } from "@/report-types/registry";

export interface ReportDetailSerialized {
  id: string;
  name: string;
  reportType: string;
  templateId?: string | null;
  definitionVersion: number;
  fiscalYear: number;
  status: ReportStatus;
  metadata: Record<string, unknown>;
  version: number;
  createdBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  creator: {
    id: string;
    name: string;
    email: string;
  } | null;
  officials: Array<{
    id: string;
    officialId: string;
    name: string;
    nip: string;
    position: string;
    institution: string;
    sortOrder: number;
    signingEnabled: boolean;
  }>;
  activeImportBatch: {
    id: string;
    originalFilename: string;
    status: string;
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    importedAt: string | Date;
  } | null;
  participantCount: number;
  selectedParticipantCount: number;
  files: Array<{
    id: string;
    filename: string;
    fileSize: number;
    status: string;
    generatedAt: string | Date;
  }>;
}

export interface TemplateOption {
  id: string;
  name: string;
}

interface ReportWorkspaceViewProps {
  report: ReportDetailSerialized;
  availableOfficials: OfficialItem[];
  availableTemplates?: TemplateOption[];
}

export function ReportWorkspaceView({
  report,
  availableOfficials,
  availableTemplates = [],
}: ReportWorkspaceViewProps) {
  const router = useRouter();
  const definition = requireReportType(report.reportType);

  const [reportName, setReportName] = useState(report.name);
  const [fiscalYear, setFiscalYear] = useState(report.fiscalYear);
  const [templateId, setTemplateId] = useState<string | null>(
    report.templateId ?? null,
  );
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    () => ({
      ...(definition.defaultMetadata as Record<string, unknown>),
      ...report.metadata,
    }),
  );
  const [officials, setOfficials] = useState<ReportOfficialAssignment[]>(() =>
    report.officials.map((o) => ({
      officialId: o.officialId,
      sortOrder: o.sortOrder,
      signingEnabled: o.signingEnabled,
    })),
  );
  const [currentVersion, setCurrentVersion] = useState(report.version);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const generateSubjectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${report.id}/generate-subject`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyusun narasi perihal / maksud.");
      }
      return json.data as { subject: string };
    },
    onSuccess: (data) => {
      handleMetadataChange("subject", data.subject);
      toast.add({
        title: "Perihal Otomatis Dibuat",
        description: "Maksud perjalanan dinas berhasil disusun berdasarkan data peserta.",
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal membuat perihal",
        description: err.message,
        type: "error",
      });
    },
  });

  function handleMetadataChange(name: string, value: unknown) {
    setMetadata((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const errors: Record<string, string> = {};
      if (reportName.trim().length < 3) {
        errors.__reportName = "Nama laporan minimal 3 karakter";
      }

      const parsedMeta = definition.metadataSchema.safeParse(metadata);
      if (!parsedMeta.success) {
        for (const issue of parsedMeta.error.issues) {
          const key = String(issue.path[0] ?? "");
          if (key && !errors[key]) {
            errors[key] = issue.message;
          }
        }
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        throw new Error(
          Object.values(errors)[0] ?? "Periksa kembali isian formulir.",
        );
      }

      setFieldErrors({});

      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName.trim(),
          fiscalYear,
          templateId,
          metadata: parsedMeta.data,
          officials,
          expectedVersion: currentVersion,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan perubahan laporan.");
      }

      return json.data as ReportDetailSerialized;
    },
    onSuccess: (updated) => {
      setCurrentVersion(updated.version);
      toast.add({
        title: "Perubahan disimpan",
        description: "Metadata laporan dan daftar petugas berhasil diperbarui.",
        type: "success",
      });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyimpan",
        description: err.message,
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${report.id}`, {
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
        description: "Laporan berhasil dihapus.",
        type: "info",
      });
      router.push("/reports");
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menghapus",
        description: err.message,
        type: "error",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Workspace */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              nativeButton={false}
              render={<Link href="/reports" />}
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Daftar Laporan
            </Button>
            <Badge variant="outline">{definition.shortName}</Badge>
            {report.status === "generated" ? (
              <Badge className="gap-1 bg-emerald-600 text-white">
                <CheckCircle2 className="size-3" />
                Generated
              </Badge>
            ) : report.status === "archived" ? (
              <Badge variant="secondary" className="gap-1">
                <Archive className="size-3" />
                Diarsipkan
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="size-3" />
                Draft
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Revisi #{currentVersion}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Dibuat oleh {report.creator?.name ?? "Operator"} • Terakhir
            diperbarui{" "}
            {new Date(report.updatedAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-1.5 size-4 text-destructive" />
            Hapus
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/reports/${report.id}/import`} />}
          >
            Lanjut ke Import Excel
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>

      {/* Wizard Stepper */}
      <ReportWizardStepper
        reportId={report.id}
        hasImportBatch={Boolean(report.activeImportBatch)}
        participantCount={report.participantCount}
        selectedParticipantCount={report.selectedParticipantCount}
        pdfCount={report.files.length}
      />

      {/* Ringkasan Status Dataset & Dokumen */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sumber Dataset Excel
            </CardTitle>
            <FileSpreadsheet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {report.activeImportBatch ? (
              <>
                <div className="truncate text-sm font-semibold">
                  {report.activeImportBatch.originalFilename}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.activeImportBatch.successfulRows} baris valid dari{" "}
                  {report.activeImportBatch.totalRows} baris
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">Belum Diunggah</div>
                <p className="text-xs text-muted-foreground">
                  Unggah file Excel pada Tahap 2
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Peserta Terpilih
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {report.selectedParticipantCount} dari {report.participantCount}{" "}
              Peserta
            </div>
            <p className="text-xs text-muted-foreground">
              Terisolasi khusus untuk laporan ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Versi Dokumen PDF
            </CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold">
              {report.files.length} Versi Tercetak
            </div>
            <p className="text-xs text-muted-foreground">
              {report.files[0]
                ? `Terakhir: ${report.files[0].filename}`
                : "Belum ada PDF yang digenerate"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Form Edit Informasi Laporan */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Laporan &amp; Surat Tugas</CardTitle>
          <CardDescription>
            Perbarui metadata perjalanan dinas yang akan dicetak pada bagian
            identitas laporan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(fieldErrors.__reportName)}
            >
              <FieldLabel htmlFor="workspace-report-name">
                Nama Laporan <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="workspace-report-name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
              {fieldErrors.__reportName && (
                <FieldError>{fieldErrors.__reportName}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="workspace-fiscal-year">
                Tahun Anggaran
              </FieldLabel>
              <Input
                id="workspace-fiscal-year"
                type="number"
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
              />
            </Field>
          </FieldGroup>

          {/* Pemilih Versi Template / Kop Surat */}
          <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <FieldLabel htmlFor="workspace-template-version" className="font-semibold text-sm">
                  Template Dokumen Resmi
                </FieldLabel>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pilih master template kop surat &amp; tata letak yang digunakan untuk mencetak laporan ini.
                </p>
              </div>
              <Link
                href="/templates"
                className="text-xs text-primary hover:underline font-medium inline-flex items-center shrink-0"
              >
                Kelola Desain di Template Editor &rarr;
              </Link>
            </div>

            <NativeSelect
              id="workspace-template"
              value={templateId ?? ""}
              onChange={(e) => setTemplateId(e.target.value ? e.target.value : null)}
            >
              <NativeSelectOption value="">
                Template Standar / Otomatis (Direkomendasikan)
              </NativeSelectOption>
              {availableTemplates.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <DynamicMetadataFields
            fields={definition.metadataFields}
            values={metadata}
            errors={fieldErrors}
            onChange={handleMetadataChange}
            fieldActions={{
              subject: (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => generateSubjectMutation.mutate()}
                  disabled={generateSubjectMutation.isPending}
                  className="gap-1 h-6 px-2 text-xs text-primary"
                >
                  {generateSubjectMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  Auto Generate Maksud
                </Button>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Form Edit Petugas */}
      <Card>
        <CardHeader>
          <CardTitle>Petugas Perjalanan Dinas</CardTitle>
          <CardDescription>
            Atur daftar petugas dan urutan penandatangan laporan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OfficialsSelector
            initialOfficials={availableOfficials}
            value={officials}
            onChange={setOfficials}
          />
        </CardContent>
        <CardFooter className="flex justify-between gap-2 border-t pt-4">
          <span className="text-xs text-muted-foreground">
            Perubahan disimpan menggunakan pemeriksaan versi (optimistic
            concurrency).
          </span>
          <Button
            type="button"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-1.5 size-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Laporan Ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus laporan{" "}
              <span className="font-medium text-foreground">{report.name}</span>
              . Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Laporan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

