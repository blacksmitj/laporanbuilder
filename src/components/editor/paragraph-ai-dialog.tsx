"use client";

import { useState } from "react";
import { Check, Copy, History, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ParagraphAiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  sectionKey: "section_a" | "section_c";
  sectionTitle: string;
  paragraphIndex: number;
  currentDraft: string;
  onApply: (generatedText: string) => void;
}

export function ParagraphAiDialog({
  open,
  onOpenChange,
  reportId,
  sectionKey,
  sectionTitle,
  paragraphIndex,
  currentDraft,
  onApply,
}: ParagraphAiDialogProps) {
  const [lengthOption, setLengthOption] = useState<"short" | "medium" | "detailed">("medium");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<"ai" | "original">("ai");
  const [viewMode, setViewMode] = useState<"side-by-side" | "stacked">("side-by-side");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isNewDraft = !currentDraft || currentDraft.trim().length === 0;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/reports/${reportId}/narratives/generate-paragraph`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionKey,
            paragraphIndex,
            currentDraft,
            lengthOption,
            additionalInstructions: additionalInstructions.trim() || undefined,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal menghasilkan narasi dengan AI.");
      }

      const text = json.data.paragraphText || "";
      setGeneratedText(text);
      setSelectedChoice("ai");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    const textToApply = selectedChoice === "ai" ? generatedText : currentDraft;
    if (textToApply.trim()) {
      onApply(textToApply.trim());
      onOpenChange(false);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setGeneratedText("");
      setErrorMessage(null);
      setSelectedChoice("ai");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-4xl sm:!max-w-4xl md:!max-w-5xl w-[95vw] !max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base">
                Poles Paragraf dengan AI
              </DialogTitle>
              <DialogDescription className="text-xs">
                {sectionTitle} — Paragraf #{paragraphIndex + 1}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs overflow-y-auto pr-1">
          {/* Status Mode */}
          <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground border">
            <span className="font-semibold text-foreground">Mode:</span>{" "}
            {isNewDraft ? (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Buat Draf Baru (kotak input saat ini masih kosong)
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Perbaiki &amp; Sempurnakan Draf Paragraf yang Ada
              </span>
            )}
          </div>

          {/* Opsi Panjang & Instruksi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel className="text-xs font-semibold">
                Panjang Tulisan
              </FieldLabel>
              <NativeSelect
                value={lengthOption}
                onChange={(e) =>
                  setLengthOption(
                    e.target.value as "short" | "medium" | "detailed",
                  )
                }
                className="w-full text-xs"
              >
                <NativeSelectOption value="short">
                  Singkat (2-3 kalimat lugas)
                </NativeSelectOption>
                <NativeSelectOption value="medium">
                  Sedang (Standar kedinasan)
                </NativeSelectOption>
                <NativeSelectOption value="detailed">
                  Penjelasan Lebar (Komprehensif &amp; detail)
                </NativeSelectOption>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <FieldLabel className="text-xs font-semibold">
                Instruksi Tambahan (Opsional)
              </FieldLabel>
              <Textarea
                rows={2}
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="Contoh: Tekankan dampak terhadap omset dan kendala izin..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* Tombol Generate */}
          <Button
            type="button"
            className="w-full text-xs"
            disabled={isLoading}
            onClick={handleGenerate}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Sedang Menyusun Narasi...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 size-3.5" />
                {generatedText ? "Generate Ulang dengan AI" : "Mulai Generate AI"}
              </>
            )}
          </Button>

          {errorMessage && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Komparasi Before vs After */}
          {generatedText && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Perbandingan Sebelum vs Sesudah (Before &amp; After)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Pilih opsi mana yang ingin Anda pakai ke draf laporan. Anda juga masih bisa mengedit teks hasil AI di bawah jika ada kekurangan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Tabs
                    value={viewMode}
                    onValueChange={(val) =>
                      setViewMode(val as "side-by-side" | "stacked")
                    }
                  >
                    <TabsList className="h-7 text-[11px]">
                      <TabsTrigger value="side-by-side" className="text-[11px] px-2 py-0.5">
                        Berdampingan
                      </TabsTrigger>
                      <TabsTrigger value="stacked" className="text-[11px] px-2 py-0.5">
                        Bertingkat
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div
                className={
                  viewMode === "side-by-side"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                    : "space-y-3"
                }
              >
                {/* Panel BEFORE */}
                <div
                  onClick={() => setSelectedChoice("original")}
                  className={`relative flex flex-col rounded-lg border p-3 cursor-pointer transition-all ${
                    selectedChoice === "original"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-muted/20 hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b mb-2">
                    <div className="flex items-center gap-1.5">
                      <History className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold text-xs text-muted-foreground">
                        BEFORE (Draf Asli)
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selectedChoice === "original"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedChoice === "original" && <Check className="size-3" />}
                      {selectedChoice === "original" ? "Dipilih" : "Klik untuk Pilih"}
                    </span>
                  </div>

                  <div className="flex-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed min-h-[90px]">
                    {currentDraft.trim() || (
                      <em className="text-muted-foreground/60 italic">
                        (Sebelumnya belum ada draf / teks kosong)
                      </em>
                    )}
                  </div>
                </div>

                {/* Panel AFTER */}
                <div
                  onClick={() => setSelectedChoice("ai")}
                  className={`relative flex flex-col rounded-lg border p-3 cursor-pointer transition-all ${
                    selectedChoice === "ai"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-muted/20 hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      <span className="font-semibold text-xs text-primary">
                        AFTER (Hasil AI Poles)
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selectedChoice === "ai"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedChoice === "ai" && <Check className="size-3" />}
                      {selectedChoice === "ai" ? "Dipilih" : "Klik untuk Pilih"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      rows={4}
                      value={generatedText}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChoice("ai");
                      }}
                      onChange={(e) => {
                        setGeneratedText(e.target.value);
                        setSelectedChoice("ai");
                      }}
                      className="text-xs leading-relaxed bg-background"
                      placeholder="Hasil narasi poles AI..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      * Kotak AFTER dapat Anda edit langsung bila ingin menambah atau menyesuaikan kata.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0 border-t pt-3 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              selectedChoice === "ai"
                ? !generatedText.trim()
                : !currentDraft.trim()
            }
            onClick={handleApply}
          >
            <Check className="mr-1.5 size-3.5" />
            {selectedChoice === "ai"
              ? "Terapkan Hasil AI ke Paragraf"
              : "Pertahankan Teks Asli"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

