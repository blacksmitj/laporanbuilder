"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckSquare,
  Eye,
  Filter,
  Loader2,
  Pencil,
  Search,
  Square,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { lpdMonevTkmColumnSpecs } from "@/report-types/lpd-monev-tkm/column-mapping";
import type { ParticipantListItem } from "@/server/services/participant-service";

interface ParticipantsManagementViewProps {
  reportId: string;
  reportName: string;
  initialParticipants: ParticipantListItem[];
  availableTeams: string[];
  availableRegencies: string[];
  pdfCount: number;
}

function formatRupiah(val: unknown): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function ParticipantsManagementView({
  reportId,
  reportName,
  initialParticipants,
  availableTeams,
  availableRegencies,
  pdfCount,
}: ParticipantsManagementViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedRegency, setSelectedRegency] = useState("all");
  const [onlySelectedFilter, setOnlySelectedFilter] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    initialParticipants.forEach((p) => {
      if (p.isSelected) s.add(p.id);
    });
    return s;
  });

  const [editingParticipant, setEditingParticipant] =
    useState<ParticipantListItem | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const [inspectParticipant, setInspectParticipant] =
    useState<ParticipantListItem | null>(null);

  const [uploadDocParticipant, setUploadDocParticipant] =
    useState<ParticipantListItem | null>(null);
  const [docType, setDocType] = useState<string>("activity");
  const [docFile, setDocFile] = useState<File | null>(null);

  // Filter local items
  const filteredParticipants = initialParticipants.filter((p) => {
    const norm = p.normalizedData;
    if (selectedTeam !== "all" && norm.team !== selectedTeam) return false;
    if (selectedRegency !== "all" && norm.interviewRegency !== selectedRegency)
      return false;
    if (onlySelectedFilter && !selectedIds.has(p.id)) return false;

    if (search.trim()) {
      const term = search.toLowerCase();
      const name = String(norm.respondentName ?? "").toLowerCase();
      const nik = String(norm.nik ?? "").toLowerCase();
      const tkmId = String(norm.tkmId ?? "").toLowerCase();
      const product = String(norm.mainProduct ?? "").toLowerCase();
      return (
        name.includes(term) ||
        nik.includes(term) ||
        tkmId.includes(term) ||
        product.includes(term)
      );
    }
    return true;
  });

  const saveSelectionMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch(`/api/reports/${reportId}/participants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedParticipantIds: ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan pilihan peserta.");
      return json.data;
    },
    onSuccess: (data) => {
      toast.add({
        title: "Pilihan peserta disimpan",
        description: `${data.selectedCount} peserta ditetapkan ke laporan ini.`,
        type: "success",
      });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyimpan pilihan",
        description: err.message,
        type: "error",
      });
    },
  });

  const updateDataMutation = useMutation({
    mutationFn: async ({
      id,
      normalizedData,
    }: {
      id: string;
      normalizedData: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/reports/${reportId}/participants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalizedData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memperbarui data peserta.");
      return json.data;
    },
    onSuccess: () => {
      toast.add({
        title: "Data peserta diperbarui",
        type: "success",
      });
      setEditingParticipant(null);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal memperbarui data",
        description: err.message,
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/${reportId}/participants/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus peserta.");
      return json;
    },
    onSuccess: () => {
      toast.add({
        title: "Peserta dihapus dari dataset",
        type: "info",
      });
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

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!uploadDocParticipant || !docFile) {
        throw new Error("Pilih file foto/dokumen terlebih dahulu.");
      }
      const formData = new FormData();
      formData.append("file", docFile);
      formData.append("documentType", docType);

      const res = await fetch(
        `/api/reports/${reportId}/participants/${uploadDocParticipant.id}/documents`,
        {
          method: "POST",
          body: formData,
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mengunggah dokumen.");
      return json.data;
    },
    onSuccess: () => {
      toast.add({
        title: "Dokumentasi diunggah",
        description: "File foto berhasil dikaitkan ke peserta.",
        type: "success",
      });
      setUploadDocParticipant(null);
      setDocFile(null);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal mengunggah",
        description: err.message,
        type: "error",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await fetch(
        `/api/reports/${reportId}/participants/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedParticipantIds: orderedIds }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah urutan.");
      return json.data;
    },
    onSuccess: () => {
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal mengubah urutan",
        description: err.message,
        type: "error",
      });
    },
  });

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function selectAll() {
    const next = new Set(selectedIds);
    filteredParticipants.forEach((p) => next.add(p.id));
    setSelectedIds(next);
  }

  function deselectAll() {
    const next = new Set(selectedIds);
    filteredParticipants.forEach((p) => next.delete(p.id));
    setSelectedIds(next);
  }

  function handleSaveSelection() {
    saveSelectionMutation.mutate(Array.from(selectedIds));
  }

  function openEdit(p: ParticipantListItem) {
    setEditingParticipant(p);
    const norm = p.normalizedData;
    setEditForm({
      respondentName: String(norm.respondentName ?? ""),
      nik: String(norm.nik ?? ""),
      tkmId: String(norm.tkmId ?? ""),
      team: String(norm.team ?? ""),
      interviewDate: String(norm.interviewDate ?? ""),
      interviewRegency: String(norm.interviewRegency ?? ""),
      interviewProvince: String(norm.interviewProvince ?? ""),
      sector: String(norm.sector ?? ""),
      businessType: String(norm.businessType ?? ""),
      mainProduct: String(norm.mainProduct ?? ""),
      fundReceivedAmount:
        norm.fundReceivedAmount !== null && norm.fundReceivedAmount !== undefined
          ? String(norm.fundReceivedAmount)
          : "",
      currentWorkers:
        norm.currentWorkers !== null && norm.currentWorkers !== undefined
          ? String(norm.currentWorkers)
          : "",
    });
  }

  function saveEdit() {
    if (!editingParticipant) return;
    const norm = { ...editingParticipant.normalizedData };
    norm.respondentName = editForm.respondentName.trim() || null;
    norm.nik = editForm.nik.trim() || null;
    norm.tkmId = editForm.tkmId.trim() || null;
    norm.team = editForm.team.trim() || null;
    norm.interviewDate = editForm.interviewDate.trim() || null;
    norm.interviewRegency = editForm.interviewRegency.trim() || null;
    norm.interviewProvince = editForm.interviewProvince.trim() || null;
    norm.sector = editForm.sector.trim() || null;
    norm.businessType = editForm.businessType.trim() || null;
    norm.mainProduct = editForm.mainProduct.trim() || null;
    norm.fundReceivedAmount = editForm.fundReceivedAmount.trim()
      ? Number(editForm.fundReceivedAmount.trim())
      : null;
    norm.currentWorkers = editForm.currentWorkers.trim()
      ? Number(editForm.currentWorkers.trim())
      : null;

    updateDataMutation.mutate({
      id: editingParticipant.id,
      normalizedData: norm,
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filteredParticipants.length) return;

    // Ordered ids based on current filter list
    const copy = [...filteredParticipants];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const orderedIds = copy.map((p) => p.id);
    reorderMutation.mutate(orderedIds);
  }

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
              Workspace Laporan
            </Button>
            <Badge variant="outline">Tahap 3 — Pilih Peserta</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola responden yang masuk ke tabel hasil kunjungan laporan PDF,
            lakukan filter TEAM/wilayah, dan koreksi data peserta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={saveSelectionMutation.isPending}
            onClick={handleSaveSelection}
          >
            {saveSelectionMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 size-4" />
            )}
            Simpan Pilihan ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/reports/${reportId}/editor`} />}
          >
            Lanjut ke Editor Narasi
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>

      <ReportWizardStepper
        reportId={reportId}
        hasImportBatch={initialParticipants.length > 0}
        participantCount={initialParticipants.length}
        selectedParticipantCount={selectedIds.size}
        pdfCount={pdfCount}
      />

      {/* Filter and Actions Bar */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <CardTitle>
                Daftar Peserta ({filteredParticipants.length} dari{" "}
                {initialParticipants.length})
              </CardTitle>
              <CardDescription>
                Pilih checkbox untuk menyertakan peserta pada laporan dokumen
                resmi.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, NIK, ID TKM..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {availableTeams.length > 0 && (
                <NativeSelect
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  aria-label="Filter TEAM"
                >
                  <NativeSelectOption value="all">Semua TEAM</NativeSelectOption>
                  {availableTeams.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {t}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}

              {availableRegencies.length > 0 && (
                <NativeSelect
                  value={selectedRegency}
                  onChange={(e) => setSelectedRegency(e.target.value)}
                  aria-label="Filter Wilayah"
                >
                  <NativeSelectOption value="all">
                    Semua Wilayah
                  </NativeSelectOption>
                  {availableRegencies.map((r) => (
                    <NativeSelectOption key={r} value={r}>
                      {r}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}

              <Button
                variant={onlySelectedFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlySelectedFilter(!onlySelectedFilter)}
              >
                <Filter className="mr-1.5 size-3.5" />
                {onlySelectedFilter ? "Hanya Terpilih" : "Semua Data"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Button size="xs" variant="outline" onClick={selectAll}>
                <CheckSquare className="mr-1.5 size-3.5" />
                Pilih Semua Tampil
              </Button>
              <Button size="xs" variant="outline" onClick={deselectAll}>
                <Square className="mr-1.5 size-3.5" />
                Batalkan Semua
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} peserta saat ini masuk ke dalam laporan final.
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Pilih</TableHead>
                <TableHead className="w-16">Urutan</TableHead>
                <TableHead>Responden &amp; NIK</TableHead>
                <TableHead>ID TKM</TableHead>
                <TableHead>TEAM / Wilayah</TableHead>
                <TableHead>Sektor / Produk</TableHead>
                <TableHead>Dana / TK</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Tidak ada data peserta yang sesuai filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParticipants.map((p, idx) => {
                  const isChecked = selectedIds.has(p.id);
                  const norm = p.normalizedData;
                  return (
                    <TableRow
                      key={p.id}
                      className={isChecked ? "bg-primary/5" : undefined}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(p.id)}
                          className="size-4 cursor-pointer rounded border-input"
                          aria-label={`Pilih ${norm.respondentName}`}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-semibold">
                            #{idx + 1}
                          </span>
                          <div className="flex flex-col">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={idx === 0}
                              onClick={() => moveItem(idx, -1)}
                              title="Naikkan urutan"
                            >
                              <ArrowUp className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={
                                idx === filteredParticipants.length - 1
                              }
                              onClick={() => moveItem(idx, 1)}
                              title="Turunkan urutan"
                            >
                              <ArrowDown className="size-3" />
                            </Button>
                          </div>
                        </div>
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
                          {String(norm.team ?? "-")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {String(norm.interviewRegency ?? "-")}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-48 truncate">
                        <div className="truncate text-xs font-medium">
                          {String(norm.sector ?? "-")}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {String(norm.mainProduct ?? "-")}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-medium">
                          {formatRupiah(norm.fundReceivedAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          TK: {String(norm.currentWorkers ?? "-")} org
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setUploadDocParticipant(p);
                            setDocFile(null);
                          }}
                          className="h-7 text-xs"
                        >
                          <Upload className="mr-1 size-3" />
                          {p.documentCount > 0
                            ? `${p.documentCount} Foto`
                            : "Upload"}
                        </Button>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Lihat seluruh data instrumen"
                            onClick={() => setInspectParticipant(p)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            title="Edit data responden"
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Hapus peserta dari laporan"
                            onClick={() => {
                              if (
                                confirm(
                                  `Hapus responden ${norm.respondentName} dari dataset laporan?`,
                                )
                              ) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Edit Responden */}
      <Dialog
        open={Boolean(editingParticipant)}
        onOpenChange={(open) => !open && setEditingParticipant(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Koreksi Data Responden</DialogTitle>
            <DialogDescription>
              Perubahan disimpan ke dataset normalisasi laporan ini tanpa
              mengubah file asli Excel.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>Nama Responden *</FieldLabel>
              <Input
                value={editForm.respondentName ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    respondentName: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>NIK (16 Digit) *</FieldLabel>
              <Input
                value={editForm.nik ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, nik: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>ID TKM Lanjutan *</FieldLabel>
              <Input
                value={editForm.tkmId ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, tkmId: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>TEAM</FieldLabel>
              <Input
                value={editForm.team ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, team: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Tanggal Monev</FieldLabel>
              <Input
                type="date"
                value={editForm.interviewDate ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    interviewDate: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Kabupaten / Kota</FieldLabel>
              <Input
                value={editForm.interviewRegency ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    interviewRegency: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Provinsi</FieldLabel>
              <Input
                value={editForm.interviewProvince ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    interviewProvince: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Sektor Usaha</FieldLabel>
              <Input
                value={editForm.sector ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, sector: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Produk Utama</FieldLabel>
              <Input
                value={editForm.mainProduct ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, mainProduct: e.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Dana Bantuan (Rp)</FieldLabel>
              <Input
                type="number"
                value={editForm.fundReceivedAmount ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    fundReceivedAmount: e.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel>Tenaga Kerja Saat Ini</FieldLabel>
              <Input
                type="number"
                value={editForm.currentWorkers ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({
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
              onClick={() => setEditingParticipant(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={updateDataMutation.isPending}
              onClick={saveEdit}
            >
              {updateDataMutation.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              )}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Unggah Dokumentasi / Foto */}
      <Dialog
        open={Boolean(uploadDocParticipant)}
        onOpenChange={(open) => !open && setUploadDocParticipant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unggah Dokumentasi Peserta</DialogTitle>
            <DialogDescription>
              Kaitkan foto tempat usaha, kegiatan, atau produk untuk peserta{" "}
              <span className="font-semibold text-foreground">
                {String(uploadDocParticipant?.normalizedData.respondentName ?? "")}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <FieldLabel>Jenis Dokumentasi</FieldLabel>
              <NativeSelect
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <NativeSelectOption value="activity">
                  Kegiatan Usaha
                </NativeSelectOption>
                <NativeSelectOption value="business">
                  Tempat Usaha
                </NativeSelectOption>
                <NativeSelectOption value="product">
                  Produk Usaha
                </NativeSelectOption>
                <NativeSelectOption value="signature">
                  Tanda Tangan
                </NativeSelectOption>
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel>Pilih File Foto (JPG/PNG)</FieldLabel>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadDocParticipant(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={uploadDocMutation.isPending || !docFile}
              onClick={() => uploadDocMutation.mutate()}
            >
              {uploadDocMutation.isPending && (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              )}
              Unggah Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Inspeksi Seluruh Kolom */}
      <Dialog
        open={Boolean(inspectParticipant)}
        onOpenChange={(open) => !open && setInspectParticipant(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Rincian Responden (
              {String(
                inspectParticipant?.normalizedData.respondentName ?? "-",
              )}
              )
            </DialogTitle>
            <DialogDescription>
              Seluruh data instrumen hasil wawancara lapangan.
            </DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-lg border text-xs">
            {lpdMonevTkmColumnSpecs.map((spec) => {
              const val = inspectParticipant?.normalizedData[spec.key];
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

