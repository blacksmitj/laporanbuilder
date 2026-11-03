"use client";

import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Loader2,
  Pencil,
  UploadCloud,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ReportWizardStepper } from "@/components/reports/report-wizard-stepper";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { ExcelParseSummary, ParsedExcelRow } from "@/lib/excel/parser";
import { lpdMonevTkmColumnSpecs } from "@/report-types/lpd-monev-tkm/column-mapping";

export interface ImportBatchMeta {
  id: string;
  reportId: string;
  originalFilename: string;
  status: string;
  isActive: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  importedAt: string | Date;
}

interface ExcelImportViewProps {
  reportId: string;
  reportName: string;
  participantCount: number;
  selectedParticipantCount: number;
  pdfCount: number;
  initialBatch: ImportBatchMeta | null;
  initialPreview: ExcelParseSummary | null;
}

function formatRupiah(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ExcelImportView({
  reportId,
  reportName,
  participantCount,
  selectedParticipantCount,
  pdfCount,
  initialBatch,
  initialPreview,
}: ExcelImportViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [batch, setBatch] = useState<ImportBatchMeta | null>(initialBatch);
  const [preview, setPreview] = useState<ExcelParseSummary | null>(
    initialPreview,
  );
  const [rowOverrides, setRowOverrides] = useState<
    Record<number, Record<string, unknown>>
  >({});
  const [editingRow, setEditingRow] = useState<ParsedExcelRow | null>(null);
  const [detailRow, setDetailRow] = useState<ParsedExcelRow | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});
  const [filterMode, setFilterMode] = useState<
    "all" | "invalid" | "warnings"
  >("all");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/reports/${reportId}/imports`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal mengunggah file Excel.");
      }
      return json.data as {
        batch: ImportBatchMeta;
        preview: ExcelParseSummary;
      };
    },
    onSuccess: (data) => {
      setBatch(data.batch);
      setPreview(data.preview);
      setRowOverrides({});
      toast.add({
        title: "File Excel berhasil diparse",
        description: `${data.preview.totalRowsRead} baris dibaca (${data.preview.validRowsCount} valid, ${data.preview.invalidRowsCount} perlu perbaikan).`,
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal membaca Excel",
        description: err.message,
        type: "error",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!batch) throw new Error("Belum ada batch import untuk dikonfirmasi.");

      const overridesArray = Object.entries(rowOverrides).map(
        ([rowNumber, overrides]) => ({
          rowNumber: Number(rowNumber),
          overrides,
        }),
      );

      const res = await fetch(
        `/api/reports/${reportId}/imports/${batch.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includeInvalidRows: false,
            autoSelectParticipants: true,
            rowOverrides: overridesArray,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal mengonfirmasi import.");
      }

      return json.data as {
        batch: ImportBatchMeta;
        insertedCount: number;
      };
    },
    onSuccess: (data) => {
      setBatch(data.batch);
      toast.add({
        title: "Import Dikonfirmasi",
        description: `${data.insertedCount} peserta berhasil disimpan ke dataset laporan.`,
        type: "success",
      });
      router.push(`/reports/${reportId}/participants`);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal mengonfirmasi import",
        description: err.message,
        type: "error",
      });
    },
  });

  function openEditDialog(row: ParsedExcelRow) {
    const merged = {
      ...row.normalizedData,
      ...(rowOverrides[row.rowNumber] ?? {}),
    };
    setEditingRow(row);
    setEditDraft({
      respondentName: String(merged.respondentName ?? ""),
      nik: String(merged.nik ?? ""),
      tkmId: String(merged.tkmId ?? ""),
      interviewDate: String(merged.interviewDate ?? ""),
      team: String(merged.team ?? ""),
      interviewRegency: String(merged.interviewRegency ?? ""),
      interviewProvince: String(merged.interviewProvince ?? ""),
      sector: String(merged.sector ?? ""),
      businessType: String(merged.businessType ?? ""),
      mainProduct: String(merged.mainProduct ?? ""),
      fundReceivedAmount:
        merged.fundReceivedAmount !== null &&
        merged.fundReceivedAmount !== undefined
          ? String(merged.fundReceivedAmount)
          : "",
      currentWorkers:
        merged.currentWorkers !== null && merged.currentWorkers !== undefined
          ? String(merged.currentWorkers)
          : "",
    });
  }

  function applyRowCorrection() {
    if (!editingRow || !preview) return;
    const rowNum = editingRow.rowNumber;

    const overrides: Record<string, unknown> = {
      respondentName: editDraft.respondentName.trim() || null,
      nik: editDraft.nik.trim() || null,
      tkmId: editDraft.tkmId.trim() || null,
      interviewDate: editDraft.interviewDate.trim() || null,
      team: editDraft.team.trim() || null,
      interviewRegency: editDraft.interviewRegency.trim() || null,
      interviewProvince: editDraft.interviewProvince.trim() || null,
      sector: editDraft.sector.trim() || null,
      businessType: editDraft.businessType.trim() || null,
      mainProduct: editDraft.mainProduct.trim() || null,
      fundReceivedAmount: editDraft.fundReceivedAmount.trim()
        ? Number.parseInt(editDraft.fundReceivedAmount.trim(), 10)
        : null,
      currentWorkers: editDraft.currentWorkers.trim()
        ? Number.parseInt(editDraft.currentWorkers.trim(), 10)
        : null,
    };

    setRowOverrides((prev) => ({
      ...prev,
      [rowNum]: overrides,
    }));

    // Client-side optimistic update on preview rows
    const updatedRows = preview.rows.map((r) => {
      if (r.rowNumber !== rowNum) return r;
      const nextNormalized = { ...r.normalizedData, ...overrides };
      const nextErrors = r.errors.filter((err) => {
        if (err.field === "respondentName") {
          return !nextNormalized.respondentName;
        }
        if (err.field === "nik") {
          return !/^\d{16}$/.test(String(nextNormalized.nik ?? ""));
        }
        if (err.field === "tkmId") {
          return !/^\d{3,20}$/.test(String(nextNormalized.tkmId ?? ""));
        }
        if (err.field === "interviewDate") {
          return !/^\d{4}-\d{2}-\d{2}$/.test(
            String(nextNormalized.interviewDate ?? ""),
          );
        }
        if (err.field === "interviewRegency") {
          return !nextNormalized.interviewRegency;
        }
        if (err.field === "interviewProvince") {
          return !nextNormalized.interviewProvince;
        }
        return false;
      });
      return {
        ...r,
        normalizedData: nextNormalized,
        errors: nextErrors,
        isValid: nextErrors.length === 0,
      };
    });

    const validCount = updatedRows.filter((r) => r.isValid).length;
    setPreview({
      ...preview,
      rows: updatedRows,
      validRowsCount: validCount,
      invalidRowsCount: updatedRows.length - validCount,
    });

    setEditingRow(null);
    toast.add({
      title: `Baris #${rowNum} diperbarui`,
      description:
        "Perubahan akan disimpan permanen saat Anda menekan Konfirmasi Import.",
      type: "info",
    });
  }

  const displayedRows = (preview?.rows ?? []).filter((row) => {
    if (filterMode === "invalid") return !row.isValid;
    if (filterMode === "warnings") return row.warnings.length > 0;
    return true;
  });

  return (
    <div className="space-y-6">
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
              Workspace Laporan
            </Button>
            <Badge variant="outline">Tahap 2 — Import Excel</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Unggah file Excel instrumen Monev, tinjau pemetaan kolom &amp;
            validasi data, lalu konfirmasi import.
          </p>
        </div>

        {batch?.status === "confirmed" && (
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/reports/${reportId}/participants`} />}
          >
            Lanjut ke Pilih Peserta
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        )}
      </div>

      <ReportWizardStepper
        reportId={reportId}
        hasImportBatch={batch?.status === "confirmed" || participantCount > 0}
        participantCount={participantCount}
        selectedParticipantCount={selectedParticipantCount}
        pdfCount={pdfCount}
      />

      {/* Area Unggah File Excel */}
      <Card>
        <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle>Unggah File Excel Instrumen Monev</CardTitle>
            <CardDescription>
              Mendukung <code>.xlsx</code>, <code>.xls</code>, atau{" "}
              <code>.tsv/.csv</code>. Satu file digunakan khusus untuk laporan
              ini (dataset terisolasi).
            </CardDescription>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadMutation.mutate(file);
                }
                e.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              disabled={uploadMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Memproses Excel...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-1.5 size-4" />
                  {batch ? "Unggah Ulang File Excel" : "Pilih File Excel"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {batch && (
          <CardContent className="border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-primary" />
                <span className="font-medium text-foreground">
                  {batch.originalFilename}
                </span>
                <Badge
                  variant={
                    batch.status === "confirmed" ? "default" : "secondary"
                  }
                >
                  {batch.status === "confirmed"
                    ? "Terkonfirmasi (Aktif)"
                    : "Menunggu Konfirmasi"}
                </Badge>
              </div>
              <span className="text-muted-foreground">
                Diunggah pada{" "}
                {new Date(batch.importedAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Hasil Parsing, Mapping & Preview */}
      {preview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Pemetaan Header Kolom
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {preview.mappedHeaders.length} /{" "}
                  {lpdMonevTkmColumnSpecs.length} Kolom
                </div>
                <p className="text-xs text-muted-foreground">
                  {preview.missingRequiredHeaders.length === 0
                    ? "Seluruh kolom wajib terdeteksi"
                    : `${preview.missingRequiredHeaders.length} kolom wajib belum ditemukan`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Baris Valid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600">
                  {preview.validRowsCount} Baris
                </div>
                <p className="text-xs text-muted-foreground">
                  Dari total {preview.totalRowsRead} responden (
                  {preview.emptyRowsSkipped.length} baris kosong diabaikan)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Baris Perlu Perbaikan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-destructive">
                  {preview.invalidRowsCount} Baris
                </div>
                <p className="text-xs text-muted-foreground">
                  Klik tombol Koreksi pada baris untuk memperbaiki
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Peringatan &amp; Duplikasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600">
                  {preview.warningRowsCount} Peringatan
                </div>
                <p className="text-xs text-muted-foreground">
                  {preview.duplicateNikWarnings.length} duplikat NIK •{" "}
                  {preview.duplicateTkmIdWarnings.length} duplikat ID TKM
                </p>
              </CardContent>
            </Card>
          </div>

          {preview.missingRequiredHeaders.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
              <p className="font-semibold">
                Perhatian: Beberapa header kolom wajib tidak ditemukan di Excel:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {preview.missingRequiredHeaders.map((m) => (
                  <li key={m.key}>{m.header}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tabel Preview Data */}
          <Card>
            <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <CardTitle>Preview &amp; Koreksi Data Responden</CardTitle>
                <CardDescription>
                  Periksa hasil normalisasi (tanggal ISO, nominal Rupiah, NIK 16
                  digit, serta tenaga kerja). Nilai kosong tetap disimpan
                  sebagai <code>null</code> (bukan 0).
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant={filterMode === "all" ? "default" : "outline"}
                  onClick={() => setFilterMode("all")}
                >
                  Semua ({preview.rows.length})
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={filterMode === "invalid" ? "default" : "outline"}
                  onClick={() => setFilterMode("invalid")}
                >
                  Error ({preview.invalidRowsCount})
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={filterMode === "warnings" ? "default" : "outline"}
                  onClick={() => setFilterMode("warnings")}
                >
                  Peringatan ({preview.warningRowsCount})
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baris</TableHead>
                    <TableHead>Responden &amp; NIK</TableHead>
                    <TableHead>ID TKM</TableHead>
                    <TableHead>Tgl Monev / TEAM</TableHead>
                    <TableHead>Wilayah</TableHead>
                    <TableHead>Usaha &amp; Produk</TableHead>
                    <TableHead>Dana &amp; TK</TableHead>
                    <TableHead>Validasi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.map((row) => {
                    const norm = row.normalizedData;
                    return (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-mono text-xs">
                          #{row.rowNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {String(norm.respondentName ?? "-")}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            NIK: {String(norm.nik ?? "-")}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {String(norm.tkmId ?? "-")}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {String(norm.interviewDate ?? "-")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            TEAM: {String(norm.team ?? "-")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {String(norm.interviewRegency ?? "-")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {String(norm.interviewProvince ?? "-")}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-52">
                          <div className="truncate text-xs font-medium">
                            {String(norm.sector ?? "-")} —{" "}
                            {String(norm.businessType ?? "-")}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            Produk: {String(norm.mainProduct ?? "-")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">
                            {formatRupiah(norm.fundReceivedAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            TK saat ini: {String(norm.currentWorkers ?? "-")} org
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {row.isValid ? (
                              <Badge
                                variant="outline"
                                className="w-fit gap-1 text-emerald-700"
                              >
                                <CheckCircle2 className="size-3" />
                                Valid
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="w-fit gap-1"
                              >
                                <XCircle className="size-3" />
                                {row.errors.length} Error
                              </Badge>
                            )}
                            {row.warnings.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="w-fit gap-1 text-amber-700"
                              >
                                <AlertTriangle className="size-3" />
                                {row.warnings.length} Peringatan
                              </Badge>
                            )}
                            {row.errors.map((err) => (
                              <span
                                key={err.field}
                                className="text-[11px] text-destructive"
                              >
                                • {err.message}
                              </span>
                            ))}
                            {row.warnings.map((w, idx) => (
                              <span
                                key={`${w.field}-${idx}`}
                                className="text-[11px] text-amber-700"
                              >
                                • {w.message}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              title="Lihat seluruh 93 kolom"
                              onClick={() => setDetailRow(row)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              onClick={() => openEditDialog(row)}
                            >
                              <Pencil className="mr-1 size-3" />
                              Koreksi
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>

            {batch?.status !== "confirmed" && (
              <CardFooter className="flex flex-col justify-between gap-4 border-t pt-4 sm:flex-row sm:items-center">
                <div className="text-xs text-muted-foreground">
                  Konfirmasi import akan menyimpan{" "}
                  <span className="font-semibold text-foreground">
                    {preview.validRowsCount} baris valid
                  </span>{" "}
                  dalam satu transaksi database dan mengaitkannya ke laporan ini.
                </div>
                <Button
                  type="button"
                  disabled={
                    confirmMutation.isPending || preview.validRowsCount === 0
                  }
                  onClick={() => confirmMutation.mutate()}
                >
                  {confirmMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Menyimpan Dataset...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-1.5 size-4" />
                      Konfirmasi &amp; Simpan ({preview.validRowsCount} Peserta)
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </>
      )}

      {/* Dialog Koreksi Baris Sebelum Konfirmasi */}
      <Dialog
        open={Boolean(editingRow)}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Koreksi Data Responden (Baris #{editingRow?.rowNumber})
            </DialogTitle>
            <DialogDescription>
              Perbaiki field yang tidak valid. Data sumber asli (raw Excel)
              tetap disimpan terpisah untuk keperluan audit.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>Nama Responden *</FieldLabel>
              <Input
                value={editDraft.respondentName ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    respondentName: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>NIK (16 Digit) *</FieldLabel>
              <Input
                value={editDraft.nik ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, nik: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>ID TKM Lanjutan *</FieldLabel>
              <Input
                value={editDraft.tkmId ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, tkmId: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Tanggal Wawancara (YYYY-MM-DD) *</FieldLabel>
              <Input
                type="date"
                value={editDraft.interviewDate ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    interviewDate: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>TEAM</FieldLabel>
              <Input
                value={editDraft.team ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, team: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Kabupaten/Kota *</FieldLabel>
              <Input
                value={editDraft.interviewRegency ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    interviewRegency: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Provinsi *</FieldLabel>
              <Input
                value={editDraft.interviewProvince ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    interviewProvince: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Sektor Usaha</FieldLabel>
              <Input
                value={editDraft.sector ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, sector: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Produk Utama</FieldLabel>
              <Input
                value={editDraft.mainProduct ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({ ...p, mainProduct: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Dana Diterima (Rp)</FieldLabel>
              <Input
                type="number"
                value={editDraft.fundReceivedAmount ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    fundReceivedAmount: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Jumlah Tenaga Kerja Saat Ini</FieldLabel>
              <Input
                type="number"
                value={editDraft.currentWorkers ?? ""}
                onChange={(e) =>
                  setEditDraft((p) => ({
                    ...p,
                    currentWorkers: e.target.value,
                  }))
                }
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingRow(null)}
            >
              Batal
            </Button>
            <Button type="button" onClick={applyRowCorrection}>
              Terapkan Koreksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Seluruh 93 Kolom */}
      <Dialog
        open={Boolean(detailRow)}
        onOpenChange={(open) => !open && setDetailRow(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Rincian Lengkap Instrumen (Baris #{detailRow?.rowNumber} —{" "}
              {String(detailRow?.normalizedData.respondentName ?? "-")})
            </DialogTitle>
            <DialogDescription>
              Seluruh 93 kolom instrumen Monev yang telah dinormalisasi.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-lg border text-xs">
            {lpdMonevTkmColumnSpecs.map((spec) => {
              const val = detailRow?.normalizedData[spec.key];
              return (
                <div
                  key={spec.key}
                  className="grid grid-cols-1 gap-1 p-2.5 sm:grid-cols-2"
                >
                  <span className="font-medium text-muted-foreground">
                    {spec.header}
                  </span>
                  <span className="font-mono break-all text-foreground">
                    {val === null || val === undefined ? (
                      <span className="italic text-muted-foreground">null</span>
                    ) : (
                      String(val)
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

