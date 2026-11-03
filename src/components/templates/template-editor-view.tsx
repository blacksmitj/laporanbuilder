"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  History,
  Layout,
  Loader2,
  Save,
  Sliders,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { TemplateConfigurationInput } from "@/lib/validations/template-schema";
import { getReportType } from "@/report-types/registry";

interface TemplateVersionItem {
  id: string;
  templateId: string;
  version: number;
  configuration: unknown;
  createdAt: string | Date;
}

interface TemplateDetailProps {
  template: {
    id: string;
    name: string;
    reportType: string;
    description: string | null;
    isActive: boolean;
    versions: TemplateVersionItem[];
    latestVersion: TemplateVersionItem | null;
  };
}

export function TemplateEditorView({ template }: TemplateDetailProps) {
  const router = useRouter();
  const reportTypeDefinition = getReportType(template.reportType);

  const initialConfig =
    (template.latestVersion?.configuration as TemplateConfigurationInput) ||
    (reportTypeDefinition?.defaultTemplate as unknown as TemplateConfigurationInput);

  const [config, setConfig] = useState<TemplateConfigurationInput>(initialConfig);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(
    template.latestVersion?.version ?? 1,
  );

  const [versionToDelete, setVersionToDelete] = useState<number | null>(null);

  // 1. Simpan Pembaruan ke Versi yang Sedang Dibuka
  const updateVersionMutation = useMutation({
    mutationFn: async ({
      version,
      updatedConfig,
    }: {
      version: number;
      updatedConfig: TemplateConfigurationInput;
    }) => {
      const res = await fetch(`/api/templates/${template.id}/versions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          configuration: updatedConfig,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memperbarui versi template.");
      return json.data as TemplateVersionItem;
    },
    onSuccess: (ver) => {
      toast.add({
        title: "Perubahan Disimpan",
        description: `Versi #${ver.version} berhasil diperbarui.`,
        type: "success",
      });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyimpan perubahan",
        description: err.message,
        type: "error",
      });
    },
  });

  // 2. Simpan Sebagai Versi Baru
  const newVersionMutation = useMutation({
    mutationFn: async (newConfig: TemplateConfigurationInput) => {
      const res = await fetch(`/api/templates/${template.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration: newConfig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan versi baru template.");
      return json.data as TemplateVersionItem;
    },
    onSuccess: (ver) => {
      setSelectedVersionNum(ver.version);
      toast.add({
        title: "Versi Baru Disimpan",
        description: `Template berhasil disimpan ke Versi #${ver.version}.`,
        type: "success",
      });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyimpan versi baru",
        description: err.message,
        type: "error",
      });
    },
  });

  // 3. Hapus Versi Tertentu
  const deleteVersionMutation = useMutation({
    mutationFn: async (versionNum: number) => {
      const res = await fetch(
        `/api/templates/${template.id}/versions?version=${versionNum}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus versi template.");
      return json;
    },
    onSuccess: (_, deletedVer) => {
      toast.add({
        title: "Versi Dihapus",
        description: `Versi #${deletedVer} berhasil dihapus dari sistem.`,
        type: "success",
      });
      setVersionToDelete(null);
      // Pindahkan pilihan ke versi pertama yang tersisa
      const remaining = template.versions.filter((v) => v.version !== deletedVer);
      if (remaining[0]) {
        handleSwitchVersion(remaining[0].version);
      }
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menghapus versi",
        description: err.message,
        type: "error",
      });
    },
  });

  function handleUpdateCurrent() {
    updateVersionMutation.mutate({
      version: selectedVersionNum,
      updatedConfig: config,
    });
  }

  function handleSaveAsNew() {
    newVersionMutation.mutate(config);
  }

  function handleSwitchVersion(verNum: number) {
    setSelectedVersionNum(verNum);
    const targetVer = template.versions.find((v) => v.version === verNum);
    if (targetVer) {
      setConfig(targetVer.configuration as TemplateConfigurationInput);
      toast.add({
        title: `Menampilkan Versi #${verNum}`,
        description: "Konfigurasi dimuat ke formulir.",
        type: "info",
      });
    }
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
              render={<Link href="/templates" />}
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Daftar Template
            </Button>
            <Badge variant="outline">
              {reportTypeDefinition?.shortName ?? template.reportType}
            </Badge>
            <Badge variant="secondary">Versi Aktif: #{selectedVersionNum}</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {template.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {template.description ||
              "Atur format kop surat, tata letak halaman A4, dan urutan bagian dokumen PDF."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol 1: Simpan & Update Versi Ini */}
          <Button
            variant="outline"
            disabled={
              updateVersionMutation.isPending || newVersionMutation.isPending
            }
            onClick={handleUpdateCurrent}
          >
            {updateVersionMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            Simpan Versi #{selectedVersionNum}
          </Button>

          {/* Tombol 2: Simpan Sebagai Versi Baru */}
          <Button
            disabled={
              newVersionMutation.isPending || updateVersionMutation.isPending
            }
            onClick={handleSaveAsNew}
          >
            {newVersionMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Copy className="mr-1.5 size-4" />
            )}
            Simpan Sebagai Versi Baru
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Kolom Riwayat Versi */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <History className="size-4" />
                Riwayat Versi
              </CardTitle>
              <CardDescription className="text-xs">
                Pilih versi untuk mengedit atau melihat konfigurasinya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {template.versions.map((v) => (
                <div
                  key={v.id}
                  className={`group flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                    v.version === selectedVersionNum
                      ? "border-primary bg-primary/5 font-semibold text-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSwitchVersion(v.version)}
                    className="flex-1 text-left"
                  >
                    <div>Versi #{v.version}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      {new Date(v.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {v.version === selectedVersionNum && (
                      <Check className="size-4 text-primary shrink-0 mr-1" />
                    )}
                    {/* Tombol Hapus Versi (hanya jika ada lebih dari 1 versi) */}
                    {template.versions.length > 1 && (
                      <button
                        type="button"
                        title={`Hapus Versi #${v.version}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setVersionToDelete(v.version);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Tab Konfigurasi */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="header" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="header">Kop &amp; Identitas</TabsTrigger>
              <TabsTrigger value="page">Tata Letak A4</TabsTrigger>
              <TabsTrigger value="sections">Bagian &amp; Narasi</TabsTrigger>
            </TabsList>

            {/* Tab 1: Kop Surat */}
            <TabsContent value="header">
              <Card>
                <CardHeader>
                  <CardTitle>Identitas Instansi &amp; Kop Surat (Cover Atas)</CardTitle>
                  <CardDescription>
                    Informasi kepala surat resmi yang dicetak pada bagian paling
                    atas laporan (dapat diaktifkan/dinonaktifkan).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Tampilkan Cover / Kop Surat Atas</div>
                      <div className="text-xs text-muted-foreground">
                        Aktifkan jika laporan membutuhkan kop resmi kementerian di bagian paling atas dokumen.
                      </div>
                    </div>
                    <Switch
                      checked={config.header.showKop ?? true}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({
                          ...prev,
                          header: {
                            ...prev.header,
                            showKop: checked,
                          },
                        }))
                      }
                    />
                  </div>

                  <FieldGroup className="gap-4">
                    {/* 1. Nama Kementerian */}
                    <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10">
                      <Field>
                        <FieldLabel className="font-semibold">Nama Kementerian</FieldLabel>
                        <Input
                          disabled={config.header.showKop === false}
                          value={config.header.ministryName}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              header: {
                                ...prev.header,
                                ministryName: e.target.value,
                              },
                            }))
                          }
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-3 pt-1">
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Jenis Font</FieldLabel>
                          <NativeSelect
                            disabled={config.header.showKop === false}
                            value={config.header.ministryFontFamily ?? "Arial, sans-serif"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  ministryFontFamily: e.target.value,
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="Arial, sans-serif">
                              Arial (Standar)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">
                              Arial Narrow (Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">
                              Helvetica Neue (Modern &amp; Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">
                              Calibri Light (Ramping Bersih)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Times New Roman', serif">
                              Times New Roman (Klasik / Formal)
                            </NativeSelectOption>
                          </NativeSelect>
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Ukuran Font (Pt)</FieldLabel>
                          <Input
                            type="number"
                            step={0.5}
                            min={7}
                            max={20}
                            disabled={config.header.showKop === false}
                            value={config.header.ministryFontSizePt ?? 10.5}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  ministryFontSizePt: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Ketebalan Font</FieldLabel>
                          <NativeSelect
                            disabled={config.header.showKop === false}
                            value={config.header.ministryFontWeight ?? "normal"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  ministryFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="normal">Normal (Ramping)</NativeSelectOption>
                            <NativeSelectOption value="500">Medium (500)</NativeSelectOption>
                            <NativeSelectOption value="600">Semi-Bold (600)</NativeSelectOption>
                            <NativeSelectOption value="bold">Bold (Tebal)</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                      </div>
                    </div>

                    {/* 2. Nama Direktorat Jenderal */}
                    <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10">
                      <Field>
                        <FieldLabel className="font-semibold">Nama Direktorat Jenderal</FieldLabel>
                        <Input
                          disabled={config.header.showKop === false}
                          value={config.header.directorateName}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              header: {
                                ...prev.header,
                                directorateName: e.target.value,
                              },
                            }))
                          }
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-3 pt-1">
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Jenis Font</FieldLabel>
                          <NativeSelect
                            disabled={config.header.showKop === false}
                            value={config.header.directorateFontFamily ?? "Arial, sans-serif"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  directorateFontFamily: e.target.value,
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="Arial, sans-serif">
                              Arial (Standar)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">
                              Arial Narrow (Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">
                              Helvetica Neue (Modern &amp; Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">
                              Calibri Light (Ramping Bersih)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Times New Roman', serif">
                              Times New Roman (Klasik / Formal)
                            </NativeSelectOption>
                          </NativeSelect>
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Ukuran Font (Pt)</FieldLabel>
                          <Input
                            type="number"
                            step={0.5}
                            min={7}
                            max={20}
                            disabled={config.header.showKop === false}
                            value={config.header.directorateFontSizePt ?? 10}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  directorateFontSizePt: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Ketebalan Font</FieldLabel>
                          <NativeSelect
                            disabled={config.header.showKop === false}
                            value={config.header.directorateFontWeight ?? "bold"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  directorateFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="normal">Normal (Ramping)</NativeSelectOption>
                            <NativeSelectOption value="500">Medium (500)</NativeSelectOption>
                            <NativeSelectOption value="600">Semi-Bold (600)</NativeSelectOption>
                            <NativeSelectOption value="bold">Bold (Tebal)</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                      </div>
                    </div>

                    {/* 3. Nama Balai / Instansi Pelaksana */}
                    <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10">
                      <Field>
                        <FieldLabel className="font-semibold">Nama Balai / Instansi Pelaksana</FieldLabel>
                        <Input
                          disabled={config.header.showKop === false}
                          value={config.header.institutionName}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              header: {
                                ...prev.header,
                                institutionName: e.target.value,
                              },
                            }))
                          }
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-3 pt-1">
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Jenis Font</FieldLabel>
                          <NativeSelect
                            disabled={config.header.showKop === false}
                            value={config.header.institutionFontFamily ?? "Arial, sans-serif"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  institutionFontFamily: e.target.value,
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="Arial, sans-serif">
                              Arial (Standar)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">
                              Arial Narrow (Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">
                              Helvetica Neue (Modern &amp; Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">
                              Calibri Light (Ramping Bersih)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Times New Roman', serif">
                              Times New Roman (Klasik / Formal)
                            </NativeSelectOption>
                          </NativeSelect>
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Ukuran Font (Pt)</FieldLabel>
                          <Input
                            type="number"
                            step={0.5}
                            min={7}
                            max={24}
                            disabled={config.header.showKop === false}
                            value={config.header.institutionFontSizePt ?? 12.5}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  institutionFontSizePt: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Ketebalan Font</FieldLabel>
                          <NativeSelect
                            disabled={config.header.showKop === false}
                            value={config.header.institutionFontWeight ?? "bold"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  institutionFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="normal">Normal (Ramping)</NativeSelectOption>
                            <NativeSelectOption value="500">Medium (500)</NativeSelectOption>
                            <NativeSelectOption value="600">Semi-Bold (600)</NativeSelectOption>
                            <NativeSelectOption value="bold">Bold (Tebal)</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                      </div>
                    </div>

                    {/* Pratinjau Kop Surat Mini */}
                    {config.header.showKop !== false && (
                      <div className="rounded-lg border p-3.5 bg-background space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Pratinjau Tipografi Kop Surat (Cover Atas):
                        </div>
                        <div className="border-l-2 border-primary/50 pl-3 py-1 space-y-1">
                          <div
                            className="leading-tight text-foreground"
                            style={{
                              fontFamily: config.header.ministryFontFamily ?? "Arial, sans-serif",
                              fontSize: `${config.header.ministryFontSizePt ?? 10.5}pt`,
                              fontWeight: config.header.ministryFontWeight ?? "normal",
                            }}
                          >
                            {config.header.ministryName || "KEMENTERIAN KETENAGAKERJAAN REPUBLIK INDONESIA"}
                          </div>
                          <div
                            className="leading-tight text-foreground"
                            style={{
                              fontFamily: config.header.directorateFontFamily ?? "Arial, sans-serif",
                              fontSize: `${config.header.directorateFontSizePt ?? 10}pt`,
                              fontWeight: config.header.directorateFontWeight ?? "bold",
                            }}
                          >
                            {config.header.directorateName || "DIREKTORAT JENDERAL..."}
                          </div>
                          <div
                            className="leading-tight text-primary font-semibold"
                            style={{
                              fontFamily: config.header.institutionFontFamily ?? "Arial, sans-serif",
                              fontSize: `${config.header.institutionFontSizePt ?? 12.5}pt`,
                              fontWeight: config.header.institutionFontWeight ?? "bold",
                            }}
                          >
                            {config.header.institutionName || "BALAI BESAR PERLUASAN KESEMPATAN KERJA"}
                          </div>
                        </div>
                      </div>
                    )}

                    <Field>
                      <FieldLabel>Alamat Lengkap Instansi</FieldLabel>
                      <Input
                        disabled={config.header.showKop === false}
                        value={config.header.institutionAddress}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            header: {
                              ...prev.header,
                              institutionAddress: e.target.value,
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Kontak Instansi (Website, Email, Telepon)</FieldLabel>
                      <Input
                        disabled={config.header.showKop === false}
                        placeholder="https://... | email@... | (022) ..."
                        value={config.header.institutionContact ?? ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            header: {
                              ...prev.header,
                              institutionContact: e.target.value,
                            },
                          }))
                        }
                      />
                    </Field>

                    {/* Margin Khusus Kop Surat (Wide Header) */}
                    <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
                      <div className="space-y-0.5">
                        <FieldLabel className="text-sm font-semibold">
                          Margin Khusus Kop Surat (Milimeter dari Tepi Kertas)
                        </FieldLabel>
                        <p className="text-xs text-muted-foreground">
                          Atur nilai lebih kecil dari margin dokumen agar kop surat lebih lebar (wide) dan lebih dekat ke tepi atas kertas.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Atas (Top Kop)</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            disabled={config.header.showKop === false}
                            value={config.header.kopMarginsMm?.top ?? 15}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  kopMarginsMm: {
                                    top: Number(e.target.value),
                                    left: prev.header.kopMarginsMm?.left ?? 15,
                                    right: prev.header.kopMarginsMm?.right ?? 15,
                                  },
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Kiri (Left Kop)</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            disabled={config.header.showKop === false}
                            value={config.header.kopMarginsMm?.left ?? 15}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  kopMarginsMm: {
                                    top: prev.header.kopMarginsMm?.top ?? 15,
                                    left: Number(e.target.value),
                                    right: prev.header.kopMarginsMm?.right ?? 15,
                                  },
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs text-muted-foreground">Kanan (Right Kop)</FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            max={50}
                            disabled={config.header.showKop === false}
                            value={config.header.kopMarginsMm?.right ?? 15}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  kopMarginsMm: {
                                    top: prev.header.kopMarginsMm?.top ?? 15,
                                    left: prev.header.kopMarginsMm?.left ?? 15,
                                    right: Number(e.target.value),
                                  },
                                },
                              }))
                            }
                          />
                        </Field>
                      </div>
                    </div>

                    <Field>
                      <FieldLabel>Judul Utama Dokumen</FieldLabel>
                      <Input
                        value={config.header.reportTitle}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            header: {
                              ...prev.header,
                              reportTitle: e.target.value,
                            },
                          }))
                        }
                      />
                    </Field>

                    <div className="rounded-lg border p-4 bg-muted/20 space-y-4">
                      <div className="font-medium text-sm text-foreground">
                        Pengaturan Tipografi Judul Dokumen
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field>
                          <FieldLabel>Jenis Font Judul</FieldLabel>
                          <NativeSelect
                            value={config.header.titleFontFamily ?? "Arial, sans-serif"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  titleFontFamily: e.target.value,
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">
                              Arial Narrow (Ramping / Hemat Ruang)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">
                              Helvetica Neue (Modern &amp; Ramping)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">
                              Calibri Light (Ramping &amp; Bersih)
                            </NativeSelectOption>
                            <NativeSelectOption value="Arial, sans-serif">
                              Arial (Standar)
                            </NativeSelectOption>
                            <NativeSelectOption value="'Times New Roman', serif">
                              Times New Roman (Klasik / Formal)
                            </NativeSelectOption>
                          </NativeSelect>
                        </Field>

                        <Field>
                          <FieldLabel>Ketebalan Huruf (Font Weight)</FieldLabel>
                          <NativeSelect
                            value={config.header.titleFontWeight ?? "bold"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  titleFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="normal">
                              Normal (Ramping / Ringan)
                            </NativeSelectOption>
                            <NativeSelectOption value="500">
                              Medium (500)
                            </NativeSelectOption>
                            <NativeSelectOption value="600">
                              Semi-Bold (600)
                            </NativeSelectOption>
                            <NativeSelectOption value="bold">
                              Bold (Tebal)
                            </NativeSelectOption>
                          </NativeSelect>
                        </Field>

                        <Field>
                          <FieldLabel>Ukuran Font Judul (Pt)</FieldLabel>
                          <Input
                            type="number"
                            min={9}
                            max={20}
                            value={config.header.titleFontSizePt ?? 11}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  titleFontSizePt: Number(e.target.value),
                                },
                              }))
                            }
                          />
                        </Field>

                        <Field>
                          <FieldLabel>Jarak Huruf (Letter Spacing)</FieldLabel>
                          <NativeSelect
                            value={config.header.titleLetterSpacing ?? "0.5px"}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                header: {
                                  ...prev.header,
                                  titleLetterSpacing: e.target.value,
                                },
                              }))
                            }
                          >
                            <NativeSelectOption value="normal">Rapat (Normal)</NativeSelectOption>
                            <NativeSelectOption value="0.5px">Standar (0.5px)</NativeSelectOption>
                            <NativeSelectOption value="1px">Renggang Ramping (1px)</NativeSelectOption>
                            <NativeSelectOption value="1.5px">Sangat Renggang (1.5px)</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                      </div>

                      {/* Pratinjau Teks Judul */}
                      <div className="pt-2 border-t text-xs text-muted-foreground space-y-1.5">
                        <span>Pratinjau Judul:</span>
                        <div
                          className="p-3 border rounded bg-background text-center text-foreground uppercase"
                          style={{
                            fontFamily: config.header.titleFontFamily ?? "Arial, sans-serif",
                            fontSize: `${config.header.titleFontSizePt ?? 11}pt`,
                            fontWeight: config.header.titleFontWeight ?? "bold",
                            letterSpacing: config.header.titleLetterSpacing ?? "0.5px",
                          }}
                        >
                          {config.header.reportTitle || "LAPORAN PERJALANAN DINAS"}
                        </div>
                      </div>
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Tata Letak Halaman A4 */}
            <TabsContent value="page">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Dokumen &amp; Margin Halaman</CardTitle>
                  <CardDescription>
                    Standar margin dan tipografi yang digunakan oleh Playwright PDF
                    engine.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>Jenis Huruf (Font Family)</FieldLabel>
                      <NativeSelect
                        value={config.page.fontFamily}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            page: { ...prev.page, fontFamily: e.target.value },
                          }))
                        }
                      >
                        <NativeSelectOption value="Times New Roman, serif">
                          Times New Roman (Standar Surat Resmi)
                        </NativeSelectOption>
                        <NativeSelectOption value="Arial, sans-serif">
                          Arial
                        </NativeSelectOption>
                        <NativeSelectOption value="Calibri, sans-serif">
                          Calibri
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>

                    <Field>
                      <FieldLabel>Ukuran Font Dokumen (Pt)</FieldLabel>
                      <Input
                        type="number"
                        min={9}
                        max={16}
                        value={config.page.fontSizePt}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              fontSizePt: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Jarak Spasi (Line Height)</FieldLabel>
                      <Input
                        type="number"
                        step={0.1}
                        min={1}
                        max={2.5}
                        value={config.page.lineHeight}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              lineHeight: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Nomor Halaman</FieldLabel>
                      <NativeSelect
                        value={config.page.showPageNumbers ? "true" : "false"}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              showPageNumbers: e.target.value === "true",
                            },
                          }))
                        }
                      >
                        <NativeSelectOption value="true">
                          Tampilkan di Kanan Bawah
                        </NativeSelectOption>
                        <NativeSelectOption value="false">
                          Sembunyikan
                        </NativeSelectOption>
                      </NativeSelect>
                    </Field>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-semibold">
                      Batas Margin Kertas A4 (Milimeter)
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Field>
                        <FieldLabel>Atas (Top)</FieldLabel>
                        <Input
                          type="number"
                          value={config.page.marginsMm.top}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              page: {
                                ...prev.page,
                                marginsMm: {
                                  ...prev.page.marginsMm,
                                  top: Number(e.target.value),
                                },
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Kiri (Left)</FieldLabel>
                        <Input
                          type="number"
                          value={config.page.marginsMm.left}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              page: {
                                ...prev.page,
                                marginsMm: {
                                  ...prev.page.marginsMm,
                                  left: Number(e.target.value),
                                },
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Kanan (Right)</FieldLabel>
                        <Input
                          type="number"
                          value={config.page.marginsMm.right}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              page: {
                                ...prev.page,
                                marginsMm: {
                                  ...prev.page.marginsMm,
                                  right: Number(e.target.value),
                                },
                              },
                            }))
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Bawah (Bottom)</FieldLabel>
                        <Input
                          type="number"
                          value={config.page.marginsMm.bottom}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              page: {
                                ...prev.page,
                                marginsMm: {
                                  ...prev.page.marginsMm,
                                  bottom: Number(e.target.value),
                                },
                              },
                            }))
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Bagian & Narasi */}
            <TabsContent value="sections">
              <Card>
                <CardHeader>
                  <CardTitle>Bagian Dokumen &amp; Narasi Standar</CardTitle>
                  <CardDescription>
                    Pilih bagian yang aktif serta narasi standar pembuka dan
                    penutup.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">
                      Bagian Laporan Aktif:
                    </h4>
                    <div className="space-y-2">
                      {reportTypeDefinition?.sections.map((sec) => {
                        const isEnabled = config.enabledSections.includes(
                          sec.key,
                        );
                        return (
                          <div
                            key={sec.key}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <div className="font-medium text-sm">
                                {sec.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sec.description}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              disabled={sec.required}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setConfig((prev) => ({
                                  ...prev,
                                  enabledSections: checked
                                    ? [...prev.enabledSections, sec.key]
                                    : prev.enabledSections.filter(
                                        (k) => k !== sec.key,
                                      ),
                                }));
                              }}
                              className="size-4"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <FieldGroup className="gap-3 border-t pt-4">
                    <Field>
                      <FieldLabel>Kota Standar Penandatanganan</FieldLabel>
                      <Input
                        value={config.signatureCityDefault}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            signatureCityDefault: e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Format Tanggal Dokumen</FieldLabel>
                      <Input
                        value={config.dateFormat}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            dateFormat: e.target.value,
                          }))
                        }
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialog Konfirmasi Hapus Versi */}
      <AlertDialog
        open={versionToDelete !== null}
        onOpenChange={(open) => !open && setVersionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Versi #{versionToDelete}?</AlertDialogTitle>
            <AlertDialogDescription>
              Versi ini akan dihapus permanen dari riwayat template. Dokumen yang tidak secara khusus dikunci ke versi ini akan beralih menggunakan versi terbaru lainnya. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteVersionMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteVersionMutation.isPending}
              onClick={() => {
                if (versionToDelete !== null) {
                  deleteVersionMutation.mutate(versionToDelete);
                }
              }}
            >
              {deleteVersionMutation.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 size-4" />
              )}
              Hapus Versi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

