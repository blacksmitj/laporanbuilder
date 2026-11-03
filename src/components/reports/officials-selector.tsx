"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  type CreateOfficialInput,
  createOfficialSchema,
} from "@/lib/validations/official-schema";
import type { ReportOfficialAssignment } from "@/lib/validations/report-schema";

export interface OfficialItem {
  id: string;
  name: string;
  nip: string;
  position: string;
  institution: string;
  isActive: boolean;
}

interface OfficialsSelectorProps {
  initialOfficials: OfficialItem[];
  value: ReportOfficialAssignment[];
  onChange: (next: ReportOfficialAssignment[]) => void;
}

export function OfficialsSelector({
  initialOfficials,
  value,
  onChange,
}: OfficialsSelectorProps) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const officialsQuery = useQuery<OfficialItem[]>({
    queryKey: ["officials", "active"],
    queryFn: async () => {
      const res = await fetch("/api/officials?active=true");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memuat data petugas.");
      }
      return json.data;
    },
    initialData: initialOfficials,
  });

  const form = useForm<CreateOfficialInput>({
    resolver: zodResolver(createOfficialSchema),
    defaultValues: {
      name: "",
      nip: "",
      position: "",
      institution: "BBPKK Bandung Barat",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateOfficialInput) => {
      const res = await fetch("/api/officials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menambahkan petugas.");
      }
      return json.data as OfficialItem;
    },
    onSuccess: (created) => {
      toast.add({
        title: "Petugas ditambahkan",
        description: `${created.name} berhasil ditambahkan ke master petugas.`,
        type: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["officials"] });
      onChange([
        ...value,
        {
          officialId: created.id,
          sortOrder: value.length,
          signingEnabled: true,
        },
      ]);
      setCreateOpen(false);
      form.reset({
        name: "",
        nip: "",
        position: "",
        institution: "BBPKK Bandung Barat",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menambahkan petugas",
        description: err.message,
        type: "error",
      });
    },
  });

  const allOfficials = officialsQuery.data ?? [];
  const officialMap = new Map(allOfficials.map((o) => [o.id, o]));

  const selectedIds = new Set(value.map((v) => v.officialId));

  function toggleOfficial(officialId: string) {
    if (selectedIds.has(officialId)) {
      const filtered = value
        .filter((v) => v.officialId !== officialId)
        .map((v, idx) => ({ ...v, sortOrder: idx }));
      onChange(filtered);
    } else {
      onChange([
        ...value,
        {
          officialId,
          sortOrder: value.length,
          signingEnabled: true,
        },
      ]);
    }
  }

  function moveOfficial(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= value.length) return;
    const copy = [...value];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, removed);
    onChange(copy.map((item, idx) => ({ ...item, sortOrder: idx })));
  }

  function toggleSigning(officialId: string) {
    onChange(
      value.map((item) =>
        item.officialId === officialId
          ? { ...item, signingEnabled: !(item.signingEnabled ?? true) }
          : item,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">
            Petugas Perjalanan Dinas ({value.length} dipilih)
          </p>
          <p className="text-xs text-muted-foreground">
            Pilih satu atau beberapa petugas pelaksana surat tugas dan atur
            urutan tanda tangan.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="mr-1.5 size-3.5" />
          Petugas Baru
        </Button>
      </div>

      {/* Daftar Petugas Terpilih (dengan urutan & status tanda tangan) */}
      {value.length > 0 && (
        <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Urutan Petugas pada Dokumen Laporan:
          </p>
          {value.map((assignment, index) => {
            const official = officialMap.get(assignment.officialId);
            if (!official) return null;
            const signing = assignment.signingEnabled ?? true;
            return (
              <div
                key={assignment.officialId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant="secondary" className="size-6 justify-center p-0">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{official.name}</div>
                    <div className="text-xs text-muted-foreground">
                      NIP. {official.nip} • {official.position}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant={signing ? "default" : "outline"}
                    size="xs"
                    onClick={() => toggleSigning(assignment.officialId)}
                  >
                    {signing ? "Penandatangan" : "Tanpa TTD"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === 0}
                    onClick={() => moveOfficial(index, -1)}
                    title="Naikkan urutan"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={index === value.length - 1}
                    onClick={() => moveOfficial(index, 1)}
                    title="Turunkan urutan"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => toggleOfficial(assignment.officialId)}
                    title="Hapus dari laporan"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pilihan dari Master Petugas */}
      <div className="grid gap-2 sm:grid-cols-2">
        {allOfficials.map((official) => {
          const isSelected = selectedIds.has(official.id);
          return (
            <button
              key={official.id}
              type="button"
              onClick={() => toggleOfficial(official.id)}
              className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="truncate text-sm font-medium">
                  {official.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  NIP. {official.nip}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {official.position} — {official.institution}
                </div>
              </div>
              <div
                className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input"
                }`}
              >
                {isSelected ? (
                  <Check className="size-3.5" />
                ) : (
                  <UserCheck className="size-3 text-muted-foreground opacity-40" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dialog Tambah Master Petugas */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Master Data Petugas</DialogTitle>
            <DialogDescription>
              Petugas yang ditambahkan akan tersimpan di master data dan
              otomatis terpilih pada laporan ini.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate(values),
            )}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(form.formState.errors.name)}>
                <FieldLabel htmlFor="official-name">
                  Nama Lengkap &amp; Gelar
                </FieldLabel>
                <Input
                  id="official-name"
                  placeholder="Contoh: Budi Santoso, S.Sos., M.Si."
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <FieldError>{form.formState.errors.name.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.nip)}>
                <FieldLabel htmlFor="official-nip">NIP</FieldLabel>
                <Input
                  id="official-nip"
                  placeholder="198504122010011008"
                  {...form.register("nip")}
                />
                {form.formState.errors.nip && (
                  <FieldError>{form.formState.errors.nip.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.position)}>
                <FieldLabel htmlFor="official-position">Jabatan</FieldLabel>
                <Input
                  id="official-position"
                  placeholder="Pengantar Kerja Ahli Muda"
                  {...form.register("position")}
                />
                {form.formState.errors.position && (
                  <FieldError>
                    {form.formState.errors.position.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.institution)}>
                <FieldLabel htmlFor="official-institution">
                  Unit Kerja / Instansi
                </FieldLabel>
                <Input
                  id="official-institution"
                  placeholder="BBPKK Bandung Barat"
                  {...form.register("institution")}
                />
                {form.formState.errors.institution && (
                  <FieldError>
                    {form.formState.errors.institution.message}
                  </FieldError>
                )}
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Simpan Petugas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

