"use client";

import { useState } from "react";
import {
  Bold,
  Check,
  Italic,
  Loader2,
  Save,
  SlidersHorizontal,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import type { TemplateConfigurationInput } from "@/lib/validations/template-schema";
import { cn } from "@/lib/utils";

export interface PreviewTemplatePanelProps {
  templateId?: string | null;
  config: TemplateConfigurationInput;
  onChange: (newConfig: TemplateConfigurationInput) => void;
  isAdmin: boolean;
  onSaveMasterSuccess?: (savedConfig: TemplateConfigurationInput) => void;
}

export function PreviewTemplatePanel({
  templateId,
  config,
  onChange,
  isAdmin,
  onSaveMasterSuccess,
}: PreviewTemplatePanelProps) {
  const [activeTab, setActiveTab] = useState<"kop" | "page">("kop");
  const [isSavingMaster, setIsSavingMaster] = useState(false);

  const handleSaveMaster = async () => {
    if (!templateId) {
      toast.add({
        title: "Tidak Dapat Menyimpan",
        description: "Template ID induk tidak ditemukan.",
        type: "error",
      });
      return;
    }

    setIsSavingMaster(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration: config }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan konfigurasi template master.");
      }

      toast.add({
        title: "Template Master Disimpan",
        description: "Konfigurasi template master berhasil diperbarui secara permanen.",
        type: "success",
      });

      if (onSaveMasterSuccess) {
        onSaveMasterSuccess(config);
      }
    } catch (err) {
      toast.add({
        title: "Gagal Menyimpan Template",
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setIsSavingMaster(false);
    }
  };

  return (
    <Card className="flex flex-col h-full border bg-card">
      <CardHeader className="pb-3 border-b bg-muted/20 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" />
            Pengaturan Template &amp; Kop
          </CardTitle>
          {isAdmin && templateId && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={isSavingMaster}
              onClick={handleSaveMaster}
              title="Simpan pengaturan ini ke template master secara permanen"
            >
              {isSavingMaster ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Save className="size-3 mr-1" />
              )}
              Simpan Master
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">
          Perubahan langsung otomatis me-render ulang pratinjau A4 di kanan.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 p-3 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "kop" | "page")}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList className="shrink-0 grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="kop" className="text-xs">Kop &amp; Identitas</TabsTrigger>
            <TabsTrigger value="page" className="text-xs">Tata Letak A4</TabsTrigger>
          </TabsList>

          {/* TAB 1: KOP SURAT */}
          <TabsContent
            value="kop"
            className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[calc(100vh-280px)]"
          >
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <div className="text-xs font-medium">Tampilkan Kop Surat / Cover Atas</div>
                <div className="text-[11px] text-muted-foreground">
                  Aktifkan jika laporan membutuhkan kop resmi kementerian di bagian paling atas.
                </div>
              </div>
              <Switch
                checked={config.header.showKop ?? true}
                onCheckedChange={(checked) =>
                  onChange({
                    ...config,
                    header: {
                      ...config.header,
                      showKop: checked,
                    },
                  })
                }
              />
            </div>

            <FieldGroup className="gap-3.5">
              {/* Nama Kementerian */}
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                <Field>
                  <FieldLabel className="font-semibold text-xs">Nama Kementerian</FieldLabel>
                  <Input
                    disabled={config.header.showKop === false}
                    value={config.header.ministryName}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        header: {
                          ...config.header,
                          ministryName: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <div className="grid gap-2 grid-cols-3 pt-1">
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Font</FieldLabel>
                    <NativeSelect
                      disabled={config.header.showKop === false}
                      value={config.header.ministryFontFamily ?? "Arial, sans-serif"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            ministryFontFamily: e.target.value,
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="Arial, sans-serif">Arial</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</NativeSelectOption>
                      <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">Calibri</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Ukuran (Pt)</FieldLabel>
                    <Input
                      type="number"
                      step={0.5}
                      min={7}
                      max={20}
                      disabled={config.header.showKop === false}
                      value={config.header.ministryFontSizePt ?? 10.5}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            ministryFontSizePt: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Tebal</FieldLabel>
                    <NativeSelect
                      disabled={config.header.showKop === false}
                      value={config.header.ministryFontWeight ?? "normal"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            ministryFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="normal">Normal</NativeSelectOption>
                      <NativeSelectOption value="500">Medium</NativeSelectOption>
                      <NativeSelectOption value="600">Semi-Bold</NativeSelectOption>
                      <NativeSelectOption value="bold">Bold</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
              </div>

              {/* Nama Direktorat Jenderal */}
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                <Field>
                  <FieldLabel className="font-semibold text-xs">Nama Direktorat Jenderal</FieldLabel>
                  <Input
                    disabled={config.header.showKop === false}
                    value={config.header.directorateName}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        header: {
                          ...config.header,
                          directorateName: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <div className="grid gap-2 grid-cols-3 pt-1">
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Font</FieldLabel>
                    <NativeSelect
                      disabled={config.header.showKop === false}
                      value={config.header.directorateFontFamily ?? "Arial, sans-serif"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            directorateFontFamily: e.target.value,
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="Arial, sans-serif">Arial</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</NativeSelectOption>
                      <NativeSelectOption value="'Calibri', Calibri, sans-serif">Calibri</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Ukuran (Pt)</FieldLabel>
                    <Input
                      type="number"
                      step={0.5}
                      min={7}
                      max={20}
                      disabled={config.header.showKop === false}
                      value={config.header.directorateFontSizePt ?? 10}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            directorateFontSizePt: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Tebal</FieldLabel>
                    <NativeSelect
                      disabled={config.header.showKop === false}
                      value={config.header.directorateFontWeight ?? "bold"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            directorateFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="normal">Normal</NativeSelectOption>
                      <NativeSelectOption value="500">Medium</NativeSelectOption>
                      <NativeSelectOption value="600">Semi-Bold</NativeSelectOption>
                      <NativeSelectOption value="bold">Bold</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                </div>
              </div>

              {/* Nama Balai / Instansi */}
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                <Field>
                  <FieldLabel className="font-semibold text-xs">Nama Balai / Instansi Pelaksana</FieldLabel>
                  <Input
                    disabled={config.header.showKop === false}
                    value={config.header.institutionName}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        header: {
                          ...config.header,
                          institutionName: e.target.value,
                        },
                      })
                    }
                  />
                </Field>
                <div className="grid gap-2 grid-cols-3 pt-1">
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Font</FieldLabel>
                    <NativeSelect
                      disabled={config.header.showKop === false}
                      value={config.header.institutionFontFamily ?? "Arial, sans-serif"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            institutionFontFamily: e.target.value,
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="Arial, sans-serif">Arial</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Ukuran (Pt)</FieldLabel>
                    <Input
                      type="number"
                      step={0.5}
                      min={7}
                      max={24}
                      disabled={config.header.showKop === false}
                      value={config.header.institutionFontSizePt ?? 12.5}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            institutionFontSizePt: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Tebal</FieldLabel>
                    <NativeSelect
                      disabled={config.header.showKop === false}
                      value={config.header.institutionFontWeight ?? "bold"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            institutionFontWeight: e.target.value as "normal" | "bold" | "500" | "600",
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="normal">Normal</NativeSelectOption>
                      <NativeSelectOption value="500">Medium</NativeSelectOption>
                      <NativeSelectOption value="600">Semi-Bold</NativeSelectOption>
                      <NativeSelectOption value="bold">Bold</NativeSelectOption>
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
                    onChange({
                      ...config,
                      header: {
                        ...config.header,
                        institutionAddress: e.target.value,
                      },
                    })
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
                    onChange({
                      ...config,
                      header: {
                        ...config.header,
                        institutionContact: e.target.value,
                      },
                    })
                  }
                />
              </Field>

              {/* Margin Khusus Kop Surat */}
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                <div className="space-y-0.5">
                  <FieldLabel className="text-xs font-semibold">
                    Margin Khusus Kop Surat (mm)
                  </FieldLabel>
                  <p className="text-[10px] text-muted-foreground">
                    Atur nilai lebih kecil dari margin halaman agar kop surat lebih lebar (wide).
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Atas</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      disabled={config.header.showKop === false}
                      value={config.header.kopMarginsMm?.top ?? 15}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            kopMarginsMm: {
                              top: Number(e.target.value),
                              left: config.header.kopMarginsMm?.left ?? 15,
                              right: config.header.kopMarginsMm?.right ?? 15,
                            },
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Kiri</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      disabled={config.header.showKop === false}
                      value={config.header.kopMarginsMm?.left ?? 15}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            kopMarginsMm: {
                              top: config.header.kopMarginsMm?.top ?? 15,
                              left: Number(e.target.value),
                              right: config.header.kopMarginsMm?.right ?? 15,
                            },
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Kanan</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      disabled={config.header.showKop === false}
                      value={config.header.kopMarginsMm?.right ?? 15}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            kopMarginsMm: {
                              top: config.header.kopMarginsMm?.top ?? 15,
                              left: config.header.kopMarginsMm?.left ?? 15,
                              right: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Judul Laporan */}
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                <div className="flex items-center justify-between">
                  <FieldLabel className="text-xs font-semibold">Judul Utama Dokumen Laporan</FieldLabel>
                  <div className="flex items-center rounded-md border bg-background p-0.5 shadow-2xs">
                    <button
                      type="button"
                      title="Tebal (Bold)"
                      className={cn(
                        "flex size-6 items-center justify-center rounded text-xs transition-colors",
                        (config.header.titleFontWeight === "bold" || !config.header.titleFontWeight)
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      onClick={() => {
                        const isBold = config.header.titleFontWeight === "bold" || !config.header.titleFontWeight;
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            titleFontWeight: isBold ? "normal" : "bold",
                          },
                        });
                      }}
                    >
                      <Bold className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      title="Miring (Italic)"
                      className={cn(
                        "flex size-6 items-center justify-center rounded text-xs transition-colors",
                        config.header.titleItalic
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      onClick={() => {
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            titleItalic: !config.header.titleItalic,
                          },
                        });
                      }}
                    >
                      <Italic className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      title="Garis Bawah (Underline)"
                      className={cn(
                        "flex size-6 items-center justify-center rounded text-xs transition-colors",
                        config.header.titleUnderline
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      onClick={() => {
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            titleUnderline: !config.header.titleUnderline,
                          },
                        });
                      }}
                    >
                      <Underline className="size-3.5" />
                    </button>
                  </div>
                </div>

                <Input
                  value={config.header.reportTitle}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      header: {
                        ...config.header,
                        reportTitle: e.target.value,
                      },
                    })
                  }
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Font Judul</FieldLabel>
                    <NativeSelect
                      value={config.header.titleFontFamily ?? "Arial, sans-serif"}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            titleFontFamily: e.target.value,
                          },
                        })
                      }
                    >
                      <NativeSelectOption value="Arial, sans-serif">Arial</NativeSelectOption>
                      <NativeSelectOption value="'Arial Narrow', Arial, sans-serif">Arial Narrow</NativeSelectOption>
                      <NativeSelectOption value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica</NativeSelectOption>
                      <NativeSelectOption value="'Calibri Light', Calibri, sans-serif">Calibri</NativeSelectOption>
                      <NativeSelectOption value="'Times New Roman', serif">Times New Roman</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Ukuran (Pt)</FieldLabel>
                    <Input
                      type="number"
                      step={0.5}
                      min={8}
                      max={20}
                      value={config.header.titleFontSizePt ?? 11}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          header: {
                            ...config.header,
                            titleFontSizePt: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>
            </FieldGroup>
          </TabsContent>

          {/* TAB 2: HALAMAN & MARGIN */}
          <TabsContent
            value="page"
            className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[calc(100vh-280px)]"
          >
            <FieldGroup className="gap-3.5">
              <div className="grid gap-3 grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs font-semibold">Font Dokumen Utama</FieldLabel>
                  <NativeSelect
                    value={config.page.fontFamily}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        page: {
                          ...config.page,
                          fontFamily: e.target.value,
                        },
                      })
                    }
                  >
                    <NativeSelectOption value="Times New Roman, serif">Times New Roman</NativeSelectOption>
                    <NativeSelectOption value="Arial, sans-serif">Arial</NativeSelectOption>
                    <NativeSelectOption value="Calibri, sans-serif">Calibri</NativeSelectOption>
                  </NativeSelect>
                </Field>

                <Field>
                  <FieldLabel className="text-xs font-semibold">Ukuran Font (Pt)</FieldLabel>
                  <Input
                    type="number"
                    min={8}
                    max={18}
                    value={config.page.fontSizePt}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        page: {
                          ...config.page,
                          fontSizePt: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Field>
              </div>

              {/* Margin Halaman */}
              <div className="space-y-2 rounded-lg border p-3 bg-muted/10">
                <FieldLabel className="text-xs font-semibold">Margin Halaman Cetak (mm)</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Atas</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={config.page.marginsMm.top}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          page: {
                            ...config.page,
                            marginsMm: {
                              ...config.page.marginsMm,
                              top: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Kiri</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={config.page.marginsMm.left}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          page: {
                            ...config.page,
                            marginsMm: {
                              ...config.page.marginsMm,
                              left: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Kanan</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={config.page.marginsMm.right}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          page: {
                            ...config.page,
                            marginsMm: {
                              ...config.page.marginsMm,
                              right: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-[11px] text-muted-foreground">Bawah</FieldLabel>
                    <Input
                      type="number"
                      min={5}
                      max={50}
                      value={config.page.marginsMm.bottom}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          page: {
                            ...config.page,
                            marginsMm: {
                              ...config.page.marginsMm,
                              bottom: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Tampilkan Nomor Halaman */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/10">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium">Tampilkan Nomor Halaman</div>
                  <div className="text-[11px] text-muted-foreground">
                    Cetak nomor halaman footer otomatis (Halaman X dari Y).
                  </div>
                </div>
                <Switch
                  checked={config.page.showPageNumbers ?? true}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...config,
                      page: {
                        ...config.page,
                        showPageNumbers: checked,
                      },
                    })
                  }
                />
              </div>
            </FieldGroup>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

