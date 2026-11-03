"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldError,
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
import type { OfficialItem } from "./officials-selector";
import {
  type CreateOfficialInput,
  createOfficialSchema,
} from "@/lib/validations/official-schema";

interface OfficialsManagementViewProps {
  initialOfficials: OfficialItem[];
}

export function OfficialsManagementView({
  initialOfficials,
}: OfficialsManagementViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOfficial, setEditingOfficial] = useState<OfficialItem | null>(
    null,
  );

  const officialsQuery = useQuery<OfficialItem[]>({
    queryKey: ["officials", "all", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/officials?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memuat data petugas.");
      }
      return json.data;
    },
    initialData: search === "" ? initialOfficials : undefined,
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

  function openCreate() {
    setEditingOfficial(null);
    form.reset({
      name: "",
      nip: "",
      position: "",
      institution: "BBPKK Bandung Barat",
    });
    setDialogOpen(true);
  }

  function openEdit(official: OfficialItem) {
    setEditingOfficial(official);
    form.reset({
      name: official.name,
      nip: official.nip,
      position: official.position,
      institution: official.institution,
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (values: CreateOfficialInput) => {
      const url = editingOfficial
        ? `/api/officials/${editingOfficial.id}`
        : "/api/officials";
      const method = editingOfficial ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan data petugas.");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.add({
        title: editingOfficial ? "Petugas diperbarui" : "Petugas ditambahkan",
        description: "Master data petugas berhasil disimpan.",
        type: "success",
      });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["officials"] });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyimpan",
        description: err.message,
        type: "error",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (official: OfficialItem) => {
      const res = await fetch(`/api/officials/${official.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !official.isActive }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal mengubah status petugas.");
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officials"] });
      toast.add({
        title: "Status petugas diperbarui",
        type: "info",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/officials/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menghapus petugas.");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officials"] });
      toast.add({
        title: "Petugas dihapus",
        type: "info",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Tidak dapat menghapus",
        description: err.message,
        type: "error",
      });
    },
  });

  const list = officialsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <CardTitle>Master Data Petugas Perjalanan Dinas</CardTitle>
          <CardDescription>
            Daftar pegawai/petugas yang dapat dipilih pada pembuatan laporan
            perjalanan dinas.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, NIP, jabatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="mr-1.5 size-4" />
            Tambah Petugas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama &amp; Gelar</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Unit Kerja / Instansi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Belum ada data petugas.
                </TableCell>
              </TableRow>
            ) : (
              list.map((official) => (
                <TableRow key={official.id}>
                  <TableCell className="font-medium">{official.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {official.nip}
                  </TableCell>
                  <TableCell>{official.position}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {official.institution}
                  </TableCell>
                  <TableCell>
                    {official.isActive ? (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="size-3" />
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Aksi petugas</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(official)}>
                          <Pencil className="size-4" />
                          Ubah Data Petugas
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleActiveMutation.mutate(official)}
                        >
                          <CheckCircle2 className="size-4" />
                          {official.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(official.id)}
                        >
                          <Trash2 className="size-4" />
                          Hapus Petugas
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOfficial ? "Ubah Data Petugas" : "Tambah Petugas Baru"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi identitas petugas pelaksana perjalanan dinas.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) =>
              saveMutation.mutate(values),
            )}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(form.formState.errors.name)}>
                <FieldLabel htmlFor="mgmt-official-name">
                  Nama Lengkap &amp; Gelar
                </FieldLabel>
                <Input id="mgmt-official-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <FieldError>{form.formState.errors.name.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.nip)}>
                <FieldLabel htmlFor="mgmt-official-nip">NIP</FieldLabel>
                <Input id="mgmt-official-nip" {...form.register("nip")} />
                {form.formState.errors.nip && (
                  <FieldError>{form.formState.errors.nip.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.position)}>
                <FieldLabel htmlFor="mgmt-official-position">
                  Jabatan
                </FieldLabel>
                <Input
                  id="mgmt-official-position"
                  {...form.register("position")}
                />
                {form.formState.errors.position && (
                  <FieldError>
                    {form.formState.errors.position.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(form.formState.errors.institution)}>
                <FieldLabel htmlFor="mgmt-official-institution">
                  Unit Kerja / Instansi
                </FieldLabel>
                <Input
                  id="mgmt-official-institution"
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
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

