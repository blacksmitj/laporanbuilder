"use client";

import { useState } from "react";
import { Check, Loader2, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import type { TemplateConfigurationInput } from "@/lib/validations/template-schema";

export interface TemplateVersionOption {
  id: string;
  version: number;
  templateName: string;
  createdAt: string | Date;
}

export interface PreviewTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  templateId?: string | null;
  currentTemplateVersionId: string | null;
  availableVersions: TemplateVersionOption[];
  initialConfig: TemplateConfigurationInput;
  isAdmin: boolean;
  onApplyTemporaryConfig: (config: TemplateConfigurationInput) => void;
  onVersionChanged: (versionId: string | null) => void;
  onConfigSaved: (newVersionId: string, updatedConfig: TemplateConfigurationInput) => void;
}

export function PreviewTemplateDialog({
  open,
  onOpenChange,
  reportId,
  templateId,
  currentTemplateVersionId,
  availableVersions,
  initialConfig,
  isAdmin,
  onApplyTemporaryConfig,
  onVersionChanged,
  onConfigSaved,
}: PreviewTemplateDialogProps) {
  const [activeTab, setActiveTab] = useState<"kop" | "page" | "version">("kop");
  const [config, setConfig] = useState<TemplateConfigurationInput>(initialConfig);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    currentTemplateVersionId ?? "",
  );
  const [isSavingReportVersion, setIsSavingReportVersion] = useState(false);
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);

  // Sync state when dialog opens or initialConfig changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setConfig(initialConfig);
      setSelectedVersionId(currentTemplateVersionId ?? "");
    }
    onOpenChange(isOpen);
  };

  // 1. Simpan pilihan versi template ke laporan ini
  const handleSaveReportVersion = async () => {
    setIsSavingReportVersion(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateVersionId: selectedVersionId ? selectedVersionId : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan versi template laporan.");
      }
      toast.add({
        title: "Versi Template Berhasil Diterapkan",
        description: "Laporan sekarang menggunakan versi template yang dipilih.",
        type: "success",
      });
      onVersionChanged(selectedVersionId ? selectedVersionId : null);
      onOpenChange(false);
    } catch (err) {
      toast.add({
        title: "Gagal Mengubah Versi",
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setIsSavingReportVersion(false);
    }
  };

  // 2. Terapkan pratinjau live sementara di layar preview
  const handleApplyTemporary = () => {
    onApplyTemporaryConfig(config);
    toast.add({
      title: "Pratinjau Diperbarui",
      description: "Perubahan kop surat & tata letak dicoba pada pratinjau visual.",
      type: "info",
    });
    onOpenChange(false);
  };

  // 3. Simpan settingan menjadi Versi Baru Template Resmi (jika ada templateId)
  const handleSaveAsNewVersion = async () => {
    if (!templateId) {
      toast.add({
        title: "Tidak Dapat Menyimpan",
        description: "Template ID induk tidak ditemukan.",
        type: "error",
      });
      return;
    }

    setIsCreatingNewVersion(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration: config }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan versi template baru.");
      }

      const newVer = json.data as { id: string; version: number };
      toast.add({
        title: "Versi Template Baru Berhasil Dibuat",
        description: `Template berhasil disimpan sebagai Versi #${newVer.version}. Mengaitkan ke laporan...`,
        type: "success",
      });

      // Update laporan agar langsung memakai versi baru ini
      await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateVersionId: newVer.id }),
      });

      onConfigSaved(newVer.id, config);
      onOpenChange(false);
    } catch (err) {
      toast.add({
        title: "Gagal Menyimpan Versi Template",
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setIsCreatingNewVersion(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!max-w-3xl sm:!max-w-3xl w-[95vw] !max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-primary" />
            <DialogTitle className="text-lg">Pengaturan Template &amp; Kop Surat</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Sesuaikan identitas kop surat instansi, tipografi judul, dan tata letak dokumen langsung dari halaman pratinjau.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "kop" | "page" | "version")}
          className="flex flex-col flex-1 overflow-hidden mt-2"
        >
          <TabsList className="shrink-0 grid grid-cols-3 w-full">
            <TabsTrigger value="kop">Kop &amp; Identitas</TabsTrigger>
            <TabsTrigger value="page">Halaman &amp; Tata Letak</TabsTrigger>
            <TabsTrigger value="version">Pilih Versi Template</TabsTrigger>
          </TabsList>

          {/* TAB 1: KOP SURAT */}
          <TabsContent value="kop" className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Tampilkan Kop Surat / Cover Atas</div>
                <div className="text-xs text-muted-foreground">
                  Aktifkan jika laporan membutuhkan kop resmi instansi di bagian atas dokumen.
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
              {/* Nama Kementerian */}
              <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10">
                <Field>
                  <FieldLabel className="font-semibold text-xs">Nama Kementerian</FieldLabel>
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
                      <NativeSelectOption value="Arial, sans-serif">Arial (Standar)</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow (Ramping)</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</NativeSelectOption>
                      <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">Calibri Light</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
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
                    <FieldLabel className="text-xs text-muted-foreground">Ketebalan</FieldLabel>
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
                      <NativeSelectOption value="normal">Normal</NativeSelectOption>
                      <NativeSelectOption value="500">Medium (500)</NativeSelectOption>
                      <NativeSelectOption value="600">Semi-Bold (600)</NativeSelectOption>
                      <NativeSelectOption value="bold">Bold (Tebal)</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
              </div>

              {/* Nama Direktorat Jenderal */}
              <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10">
                <Field>
                  <FieldLabel className="font-semibold text-xs">Nama Direktorat Jenderal</FieldLabel>
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
                      <NativeSelectOption value="Arial, sans-serif">Arial (Standar)</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</NativeSelectOption>
                      <NativeSelectOption value="'Calibri', Calibri, sans-serif">Calibri</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
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
                    <FieldLabel className="text-xs text-muted-foreground">Ketebalan</FieldLabel>
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
                      <NativeSelectOption value="normal">Normal</NativeSelectOption>
                      <NativeSelectOption value="500">Medium (500)</NativeSelectOption>
                      <NativeSelectOption value="600">Semi-Bold (600)</NativeSelectOption>
                      <NativeSelectOption value="bold">Bold (Tebal)</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
              </div>

              {/* Nama Balai / Instansi */}
              <div className="space-y-2 rounded-lg border p-3.5 bg-muted/10">
                <Field>
                  <FieldLabel className="font-semibold text-xs">Nama Balai / Instansi Pelaksana</FieldLabel>
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
                      <NativeSelectOption value="Arial, sans-serif">Arial (Standar)</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica Neue</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
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
                    <FieldLabel className="text-xs text-muted-foreground">Ketebalan</FieldLabel>
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
                      <NativeSelectOption value="normal">Normal</NativeSelectOption>
                      <NativeSelectOption value="500">Medium (500)</NativeSelectOption>
                      <NativeSelectOption value="600">Semi-Bold (600)</NativeSelectOption>
                      <NativeSelectOption value="bold">Bold (Tebal)</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
              </div>

              {/* Alamat & Kontak */}
              <Field>
                <FieldLabel className="text-xs font-semibold">Alamat Lengkap Instansi</FieldLabel>
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
                <FieldLabel className="text-xs font-semibold">Kontak Instansi (Website | Email | Telepon)</FieldLabel>
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
              <div className="space-y-3 rounded-lg border p-3.5 bg-muted/10">
                <div className="space-y-0.5">
                  <FieldLabel className="text-xs font-semibold">
                    Margin Khusus Kop Surat (Milimeter dari Tepi Kertas)
                  </FieldLabel>
                  <p className="text-[11px] text-muted-foreground">
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

              {/* Judul Laporan */}
              <Field>
                <FieldLabel className="text-xs font-semibold">Judul Utama Dokumen Laporan</FieldLabel>
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
            </FieldGroup>
          </TabsContent>

          {/* TAB 2: HALAMAN & MARGIN */}
          <TabsContent value="page" className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs font-semibold">Font Dokumen Utama</FieldLabel>
                  <NativeSelect
                    value={config.page.fontFamily}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        page: {
                          ...prev.page,
                          fontFamily: e.target.value,
                        },
                      }))
                    }
                  >
                    <NativeSelectOption value="Times New Roman, serif">Times New Roman (Klasik / Formal)</NativeSelectOption>
                    <NativeSelectOption value="Arial, sans-serif">Arial (Modern Bersih)</NativeSelectOption>
                    <NativeSelectOption value="Calibri, sans-serif">Calibri (Standar Office)</NativeSelectOption>
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel className="text-xs font-semibold">Ukuran Font Dokumen (Pt)</FieldLabel>
                  <Input
                    type="number"
                    min={8}
                    max={18}
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
              </div>

              {/* Margin Halaman */}
              <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
                <FieldLabel className="text-xs font-semibold">Margin Halaman Cetak (Milimeter)</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field>
                    <FieldLabel className="text-xs text-muted-foreground">Atas (Top)</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
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
                    <FieldLabel className="text-xs text-muted-foreground">Kiri (Left)</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
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
                    <FieldLabel className="text-xs text-muted-foreground">Kanan (Right)</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
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
                    <FieldLabel className="text-xs text-muted-foreground">Bawah (Bottom)</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
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
            </FieldGroup>
          </TabsContent>

          {/* TAB 3: VERSI TEMPLATE TERDAFTAR */}
          <TabsContent value="version" className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
            <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
              <div>
                <FieldLabel className="font-semibold text-sm">Pilih Versi Template Tersimpan</FieldLabel>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tentukan versi kop surat &amp; layout yang digunakan untuk dokumen laporan ini.
                </p>
              </div>

              <NativeSelect
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
              >
                <NativeSelectOption value="">
                  Versi Otomatis / Terbaru (Direkomendasikan)
                </NativeSelectOption>
                {availableVersions.map((v) => (
                  <NativeSelectOption key={v.id} value={v.id}>
                    {v.templateName} &bull; Versi #{v.version} (
                    {new Date(v.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    )
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <div className="pt-2">
                <Button
                  size="sm"
                  disabled={isSavingReportVersion}
                  onClick={handleSaveReportVersion}
                >
                  {isSavingReportVersion ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Menerapkan Versi...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1.5 size-4" />
                      Terapkan Versi Ini ke Laporan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 mt-3 flex-col sm:flex-row sm:justify-between items-center">
          <div className="text-[11px] text-muted-foreground order-2 sm:order-1">
            * Perubahan dapat langsung dicoba ke pratinjau atau disimpan permanen ke template master.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyTemporary}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Coba di Preview
            </Button>
            {isAdmin && templateId && (
              <Button
                type="button"
                size="sm"
                disabled={isCreatingNewVersion}
                onClick={handleSaveAsNewVersion}
              >
                {isCreatingNewVersion ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 size-3.5" />
                    Simpan Template Master
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

