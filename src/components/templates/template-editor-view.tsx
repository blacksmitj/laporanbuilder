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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  const newVersionMutation = useMutation({
    mutationFn: async (newConfig: TemplateConfigurationInput) => {
      const res = await fetch(`/api/templates/${template.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration: newConfig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan versi template.");
      return json.data as TemplateVersionItem;
    },
    onSuccess: (ver) => {
      toast.add({
        title: "Versi Baru Disimpan",
        description: `Template berhasil diperbarui ke Versi #${ver.version}. Dokumen lama tetap terjaga.`,
        type: "success",
      });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyimpan versi",
        description: err.message,
        type: "error",
      });
    },
  });

  function handleSave() {
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

        <div className="flex items-center gap-2">
          <Button
            disabled={newVersionMutation.isPending}
            onClick={handleSave}
          >
            {newVersionMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
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
                Setiap penyimpanan menghasilkan versi baru (immutable).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {template.versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSwitchVersion(v.version)}
                  className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-colors ${
                    v.version === selectedVersionNum
                      ? "border-primary bg-primary/5 font-semibold text-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <div>Versi #{v.version}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {v.version === selectedVersionNum && (
                    <Check className="size-4 text-primary" />
                  )}
                </button>
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
                  <CardTitle>Identitas Instansi &amp; Kop Surat</CardTitle>
                  <CardDescription>
                    Informasi kepala surat resmi yang dicetak pada bagian paling
                    atas laporan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FieldGroup className="gap-3">
                    <Field>
                      <FieldLabel>Nama Kementerian</FieldLabel>
                      <Input
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

                    <Field>
                      <FieldLabel>Nama Direktorat Jenderal</FieldLabel>
                      <Input
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

                    <Field>
                      <FieldLabel>Nama Balai / Instansi Pelaksana</FieldLabel>
                      <Input
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

                    <Field>
                      <FieldLabel>Alamat Lengkap Instansi</FieldLabel>
                      <Input
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
    </div>
  );
}

