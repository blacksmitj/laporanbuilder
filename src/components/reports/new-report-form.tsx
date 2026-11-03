"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DynamicMetadataFields } from "@/components/reports/dynamic-metadata-fields";
import {
  type OfficialItem,
  OfficialsSelector,
} from "@/components/reports/officials-selector";
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
import { toast } from "@/components/ui/toast";
import type { ReportOfficialAssignment } from "@/lib/validations/report-schema";
import { listReportTypes, requireReportType } from "@/report-types/registry";

interface NewReportFormProps {
  initialOfficials: OfficialItem[];
}

export function NewReportForm({ initialOfficials }: NewReportFormProps) {
  const router = useRouter();
  const reportTypes = listReportTypes();
  const [selectedTypeKey, setSelectedTypeKey] = useState<string>(
    reportTypes[0]?.key ?? "lpd-monev-tkm",
  );

  const currentDefinition = requireReportType(selectedTypeKey);

  const [reportName, setReportName] = useState("");
  const [fiscalYear, setFiscalYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    () => ({ ...(currentDefinition.defaultMetadata as Record<string, unknown>) }),
  );
  const [officials, setOfficials] = useState<ReportOfficialAssignment[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSelectReportType(key: string) {
    const def = requireReportType(key);
    setSelectedTypeKey(key);
    setMetadata({ ...(def.defaultMetadata as Record<string, unknown>) });
    setFieldErrors({});
  }

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const errors: Record<string, string> = {};
      if (reportName.trim().length < 3) {
        errors.__reportName = "Nama laporan minimal 3 karakter";
      }
      if (!Number.isInteger(fiscalYear) || fiscalYear < 2020) {
        errors.__fiscalYear = "Tahun anggaran tidak valid";
      }

      const parsedMeta = currentDefinition.metadataSchema.safeParse(metadata);
      if (!parsedMeta.success) {
        for (const issue of parsedMeta.error.issues) {
          const fieldKey = String(issue.path[0] ?? "");
          if (fieldKey && !errors[fieldKey]) {
            errors[fieldKey] = issue.message;
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

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName.trim(),
          reportType: selectedTypeKey,
          fiscalYear,
          metadata: parsedMeta.data,
          officials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal membuat laporan baru.");
      }

      return json.data as { id: string };
    },
    onSuccess: (created) => {
      toast.add({
        title: "Laporan berhasil dibuat",
        description:
          "Workspace laporan siap. Lanjutkan ke unggah file Excel Monev.",
        type: "success",
      });
      router.push(`/reports/${created.id}`);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal membuat laporan",
        description: err.message,
        type: "error",
      });
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              render={<Link href="/reports" />}
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Kembali ke Daftar Laporan
            </Button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Buat Laporan Baru
          </h1>
          <p className="text-sm text-muted-foreground">
            Tahap 1 — Pilih jenis laporan, lengkapi informasi surat tugas, dan
            tetapkan petugas pelaksana.
          </p>
        </div>
      </div>

      {/* Pilihan Jenis Laporan dari Registry */}
      <Card>
        <CardHeader>
          <CardTitle>1. Pilih Jenis Laporan</CardTitle>
          <CardDescription>
            Formulir informasi, struktur bagian, serta aturan validasi Excel
            otomatis menyesuaikan jenis laporan yang dipilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {reportTypes.map((rt) => {
              const selected = rt.key === selectedTypeKey;
              return (
                <button
                  key={rt.key}
                  type="button"
                  onClick={() => handleSelectReportType(rt.key)}
                  className={`flex flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={selected ? "default" : "secondary"}>
                        {rt.shortName}
                      </Badge>
                      {selected && (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{rt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rt.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <FileSpreadsheet className="size-3.5" />
                    <span>
                      Sumber data: {rt.dataSource.toUpperCase()} •{" "}
                      {rt.sections.length} Bagian Dokumen • v{rt.version}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Identitas Umum & Metadata Dinamis */}
      <Card>
        <CardHeader>
          <CardTitle>2. Informasi Laporan &amp; Surat Tugas</CardTitle>
          <CardDescription>
            Isi nama laporan internal serta rincian perjalanan dinas sesuai
            Surat Tugas (ST).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(fieldErrors.__reportName)}
            >
              <FieldLabel htmlFor="report-name">
                Nama Laporan <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="report-name"
                placeholder="Contoh: LPD Monev TKM Lanjutan Kab. Aceh Besar — Oktober 2026"
                value={reportName}
                aria-invalid={Boolean(fieldErrors.__reportName)}
                onChange={(e) => {
                  setReportName(e.target.value);
                  if (fieldErrors.__reportName) {
                    setFieldErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.__reportName;
                      return copy;
                    });
                  }
                }}
              />
              {fieldErrors.__reportName && (
                <FieldError>{fieldErrors.__reportName}</FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(fieldErrors.__fiscalYear)}>
              <FieldLabel htmlFor="fiscal-year">
                Tahun Anggaran <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="fiscal-year"
                type="number"
                min={2020}
                max={2100}
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
              />
              {fieldErrors.__fiscalYear && (
                <FieldError>{fieldErrors.__fiscalYear}</FieldError>
              )}
            </Field>
          </FieldGroup>

          <DynamicMetadataFields
            fields={currentDefinition.metadataFields}
            values={metadata}
            errors={fieldErrors}
            onChange={handleMetadataChange}
          />
        </CardContent>
      </Card>

      {/* Petugas Perjalanan Dinas */}
      <Card>
        <CardHeader>
          <CardTitle>3. Petugas Perjalanan Dinas</CardTitle>
          <CardDescription>
            Pilih petugas yang tercantum dalam Surat Tugas dan akan ditampilkan
            pada bagian identitas serta blok tanda tangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OfficialsSelector
            initialOfficials={initialOfficials}
            value={officials}
            onChange={setOfficials}
          />
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            render={<Link href="/reports" />}
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Menyimpan Laporan...
              </>
            ) : (
              <>
                Simpan &amp; Buka Workspace
                <ArrowRight className="ml-1.5 size-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

