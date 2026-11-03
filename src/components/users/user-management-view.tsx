"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import type { UserRole } from "@/lib/db/schema";
import {
  type CreateUserInput,
  createUserSchema,
  type UpdateUserInput,
  updateUserSchema,
} from "@/lib/validations/user-schema";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface UserManagementViewProps {
  initialUsers: UserListItem[];
  currentUserId: string;
}

export function UserManagementView({
  initialUsers,
  currentUserId,
}: UserManagementViewProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);

  const usersQuery = useQuery<UserListItem[]>({
    queryKey: ["users", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/users?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memuat daftar pengguna.");
      }
      return json.data;
    },
    initialData: search === "" ? initialUsers : undefined,
  });

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "operator",
    },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      role: "operator",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal membuat pengguna.");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.add({
        title: "Pengguna ditambahkan",
        description: "Akun pengguna baru berhasil dibuat.",
        type: "success",
      });
      setCreateOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal membuat pengguna",
        description: err.message,
        type: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUserInput;
    }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memperbarui pengguna.");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.add({
        title: "Perubahan disimpan",
        description: "Data pengguna berhasil diperbarui.",
        type: "success",
      });
      setEditingUser(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal memperbarui",
        description: err.message,
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menghapus pengguna.");
      }
      return json;
    },
    onSuccess: () => {
      toast.add({
        title: "Pengguna dihapus",
        description: "Akun pengguna telah dihapus dari sistem.",
        type: "info",
      });
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menghapus",
        description: err.message,
        type: "error",
      });
    },
  });

  function openEditModal(user: UserListItem) {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      role: user.role,
      password: "",
    });
  }

  function handleEditSubmit(values: UpdateUserInput) {
    if (!editingUser) return;
    const payload: UpdateUserInput = {
      name: values.name,
      role: values.role,
    };
    if (values.password && values.password.trim().length > 0) {
      payload.password = values.password;
    }
    updateMutation.mutate({ id: editingUser.id, payload });
  }

  const usersList = usersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun Administrator dan Operator beserta hak aksesnya.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-1.5 size-4" />
          Tambah Pengguna
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <CardTitle>Daftar Pengguna</CardTitle>
            <CardDescription>
              Operator hanya dapat mengakses laporan yang dibuat oleh akunnya
              sendiri.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersList.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Tidak ada pengguna yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                usersList.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px]">
                              Anda
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge className="gap-1">
                            <ShieldCheck className="size-3" />
                            Administrator
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Operator</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="size-3" />
                            Nonaktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="size-3 text-emerald-600" />
                            Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Menu aksi</span>
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditModal(user)}
                            >
                              <UserCog className="size-4" />
                              Ubah Data / Reset Sandi
                            </DropdownMenuItem>
                            {!isSelf && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateMutation.mutate({
                                      id: user.id,
                                      payload: { banned: !user.banned },
                                    })
                                  }
                                >
                                  <Ban className="size-4" />
                                  {user.banned
                                    ? "Aktifkan Kembali"
                                    : "Nonaktifkan Akun"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingUser(user)}
                                >
                                  <Trash2 className="size-4" />
                                  Hapus Pengguna
                                </DropdownMenuItem>
                              </>
                            )}
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

      {/* Dialog Tambah Pengguna */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk Operator atau Administrator.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((values) =>
              createMutation.mutate(values),
            )}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(createForm.formState.errors.name)}>
                <FieldLabel htmlFor="create-name">Nama Lengkap</FieldLabel>
                <Input
                  id="create-name"
                  placeholder="Nama pegawai"
                  {...createForm.register("name")}
                />
                {createForm.formState.errors.name && (
                  <FieldError>
                    {createForm.formState.errors.name.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(createForm.formState.errors.email)}>
                <FieldLabel htmlFor="create-email">Email</FieldLabel>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="nama@kemnaker.go.id"
                  {...createForm.register("email")}
                />
                {createForm.formState.errors.email && (
                  <FieldError>
                    {createForm.formState.errors.email.message}
                  </FieldError>
                )}
              </Field>

              <Field
                data-invalid={Boolean(createForm.formState.errors.password)}
              >
                <FieldLabel htmlFor="create-password">
                  Kata Sandi Awal
                </FieldLabel>
                <Input
                  id="create-password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  {...createForm.register("password")}
                />
                {createForm.formState.errors.password && (
                  <FieldError>
                    {createForm.formState.errors.password.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(createForm.formState.errors.role)}>
                <FieldLabel htmlFor="create-role">Peran</FieldLabel>
                <NativeSelect
                  id="create-role"
                  className="w-full"
                  {...createForm.register("role")}
                >
                  <NativeSelectOption value="operator">
                    Operator (Pembuat Laporan)
                  </NativeSelectOption>
                  <NativeSelectOption value="admin">
                    Administrator (Akses Penuh)
                  </NativeSelectOption>
                </NativeSelect>
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
                Simpan Pengguna
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Pengguna */}
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Data Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui nama, peran, atau atur ulang kata sandi untuk{" "}
              <span className="font-medium text-foreground">
                {editingUser?.email}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={Boolean(editForm.formState.errors.name)}>
                <FieldLabel htmlFor="edit-name">Nama Lengkap</FieldLabel>
                <Input id="edit-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <FieldError>
                    {editForm.formState.errors.name.message}
                  </FieldError>
                )}
              </Field>

              <Field data-invalid={Boolean(editForm.formState.errors.role)}>
                <FieldLabel htmlFor="edit-role">Peran</FieldLabel>
                <NativeSelect
                  id="edit-role"
                  className="w-full"
                  disabled={editingUser?.id === currentUserId}
                  {...editForm.register("role")}
                >
                  <NativeSelectOption value="operator">
                    Operator
                  </NativeSelectOption>
                  <NativeSelectOption value="admin">
                    Administrator
                  </NativeSelectOption>
                </NativeSelect>
              </Field>

              <Field data-invalid={Boolean(editForm.formState.errors.password)}>
                <FieldLabel htmlFor="edit-password">
                  <KeyRound className="mr-1 inline size-3.5" />
                  Kata Sandi Baru (Opsional)
                </FieldLabel>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah sandi"
                  {...editForm.register("password")}
                />
                {editForm.formState.errors.password && (
                  <FieldError>
                    {editForm.formState.errors.password.message}
                  </FieldError>
                )}
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingUser(null)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun Pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus akun{" "}
              <span className="font-medium text-foreground">
                {deletingUser?.name} ({deletingUser?.email})
              </span>
              . Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deletingUser && deleteMutation.mutate(deletingUser.id)
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

