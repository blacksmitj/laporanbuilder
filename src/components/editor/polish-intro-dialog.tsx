"use client";

import { useState } from "react";
import { Check, History, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PolishIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  currentDraft: string;
  onApply: (polishedText: string) => void;
}

export function PolishIntroDialog({
  open,
  onOpenChange,
  reportId,
  currentDraft,
  onApply,
}: PolishIntroDialogProps) {
  const [generatedText, setGeneratedText] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<"ai" | "original">("ai");
  const [viewMode, setViewMode] = useState<"side-by-side" | "stacked">("side-by-side");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/narratives/polish-intro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentIntro: currentDraft }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal memoles narasi dengan AI.");
      }

      const text = json.data.text || "";
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
                Poles Kalimat Wilayah Monitoring (Poin e)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Sempurnakan kalimat pengantar lokasi monitoring menjadi bahasa kedinasan resmi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs overflow-y-auto pr-1">
          {/* Tombol Generate jika belum dibuat */}
          {!generatedText && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <span className="font-semibold text-xs text-muted-foreground block mb-1">
                  Draf Teks Saat Ini:
                </span>
                <p className="text-xs leading-relaxed text-foreground">
                  {currentDraft || "(Teks masih kosong)"}
                </p>
              </div>

              <Button
                type="button"
                className="w-full text-xs"
                disabled={isLoading || !currentDraft.trim()}
                onClick={handleGenerate}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Sedang Memoles dengan AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 size-3.5" />
                    Mulai Poles Kalimat Sekarang
                  </>
                )}
              </Button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Perbandingan Before vs After */}
          {generatedText && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Perbandingan Sebelum vs Sesudah (Before &amp; After)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Bandingkan narasi awal dengan rekomendasi AI. Pilih yang sesuai atau sempurnakan langsung.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={isLoading}
                    onClick={handleGenerate}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 size-3 text-primary" />
                    )}
                    Poles Ulang
                  </Button>
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
                    {currentDraft.trim() || "(Teks kosong)"}
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
                      placeholder="Hasil poles AI..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      * Anda dapat menyunting kalimat di atas secara langsung sebelum menerapkannya.
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
              ? "Terapkan Hasil AI ke Poin e"
              : "Pertahankan Teks Asli"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

