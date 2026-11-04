"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type PolishTargetType =
  | "section_a"
  | "section_b_intro"
  | "participant"
  | "section_c"
  | "closing";

export interface UnifiedAiPolishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  targetType: PolishTargetType;
  title: string;
  subtitle?: string;
  currentDraft: string;
  participantId?: string;
  paragraphIndex?: number;
  onApply: (polishedText: string) => void;
}

export function UnifiedAiPolishDialog({
  open,
  onOpenChange,
  reportId,
  targetType,
  title,
  subtitle,
  currentDraft,
  participantId,
  paragraphIndex,
  onApply,
}: UnifiedAiPolishDialogProps) {
  const [mode, setMode] = useState<"fix" | "enhance">("fix");
  const [lengthOption, setLengthOption] = useState<"short" | "medium" | "detailed">("medium");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<"ai" | "original">("ai");
  const [viewMode, setViewMode] = useState<"side-by-side" | "stacked">("side-by-side");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isNewDraft = !currentDraft || currentDraft.trim().length === 0;

  // Otomatis arahkan ke mode "enhance" jika teks draf awal kosong
  useEffect(() => {
    if (open && isNewDraft) {
      setMode("enhance");
    }
  }, [open, isNewDraft]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/narratives/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          participantId,
          paragraphIndex,
          currentDraft,
          mode,
          lengthOption,
          additionalInstructions: additionalInstructions.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.error || "Gagal memoles narasi dengan AI.");
      }

      const text = json.data?.polishedText || "";
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
      handleClose(false);
    }
  };

  const handleCopy = async () => {
    const text = selectedChoice === "ai" ? generatedText : currentDraft;
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setGeneratedText("");
      setErrorMessage(null);
      setSelectedChoice("ai");
      setAdditionalInstructions("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="space-y-1 pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {subtitle ||
                  "Poles dan perbaiki draf narasi menggunakan kecerdasan buatan terstandarisasi BBPKK Bandung Barat."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-3">
          {/* Controls: Mode, Panjang, & Instruksi Tambahan */}
          <div className="bg-muted/40 p-3.5 rounded-lg border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pilihan Mode */}
              <div className="space-y-1.5">
                <FieldLabel className="text-xs font-semibold">Mode Polesan AI</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={mode === "fix" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs justify-center"
                    onClick={() => setMode("fix")}
                  >
                    <Wand2 className="mr-1.5 size-3.5" />
                    Perbaiki
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "enhance" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs justify-center"
                    onClick={() => setMode("enhance")}
                  >
                    <Sparkles className="mr-1.5 size-3.5" />
                    Sempurnakan
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {mode === "fix"
                    ? "Koreksi tata bahasa kedinasan (EYD/KBBI) & struktur kalimat tanpa mengubah fakta."
                    : isNewDraft
                    ? "Draf awal kosong; AI akan menyusun draf narasi baru secara otomatis."
                    : "Perkaya analisis, lengkapi konteks lapangan, dan elaborasi narasi lebih tajam."}
                </p>
              </div>

              {/* Pilihan Panjang Tulisan */}
              <div className="space-y-1.5">
                <FieldLabel className="text-xs font-semibold">Panjang Tulisan</FieldLabel>
                <NativeSelect
                  value={lengthOption}
                  onChange={(e) =>
                    setLengthOption(e.target.value as "short" | "medium" | "detailed")
                  }
                  className="h-8 text-xs"
                >
                  <NativeSelectOption value="short">
                    Ringkas (2-3 kalimat lugas & padat)
                  </NativeSelectOption>
                  <NativeSelectOption value="medium">
                    Sedang (Standar kedinasan, 4-5 kalimat)
                  </NativeSelectOption>
                  <NativeSelectOption value="detailed">
                    Panjang (1-2 paragraf komprehensif & mendalam)
                  </NativeSelectOption>
                </NativeSelect>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Menyesuaikan kedalaman pembahasan narasi sesuai format kedinasan.
                </p>
              </div>
            </div>

            {/* Input Instruksi Tambahan */}
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <FieldLabel className="text-xs font-medium text-muted-foreground">
                Instruksi Tambahan (Opsional)
              </FieldLabel>
              <Textarea
                rows={2}
                placeholder="Contoh: Tekankan aspek pemasaran digital, atau sebutkan kendala bahan baku..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            {/* Tombol Eksekusi AI */}
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                size="sm"
                className="h-8 px-4 text-xs font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Sedang Memoles...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 size-3.5" />
                    {generatedText ? "Poles Ulang AI" : "Poles Sekarang"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
              {errorMessage}
            </div>
          )}

          {/* Area Review & Perbandingan Before-After */}
          {generatedText ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Hasil Generasi & Perbandingan Draf
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleCopy}
                    className="h-7 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 size-3 text-green-600" />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 size-3" />
                        Salin
                      </>
                    )}
                  </Button>
                  <Tabs
                    value={viewMode}
                    onValueChange={(val) => setViewMode(val as "side-by-side" | "stacked")}
                  >
                    <TabsList className="h-7">
                      <TabsTrigger value="side-by-side" className="text-[11px] px-2.5 h-6">
                        Berdampingan
                      </TabsTrigger>
                      <TabsTrigger value="stacked" className="text-[11px] px-2.5 h-6">
                        Bertingkat
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* View Container */}
              <div
                className={`grid gap-3 ${
                  viewMode === "side-by-side" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                }`}
              >
                {/* Draf Asli */}
                <div
                  onClick={() => setSelectedChoice("original")}
                  className={`border rounded-lg p-3.5 text-xs flex flex-col justify-between cursor-pointer transition-all ${
                    selectedChoice === "original"
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:border-border/80 bg-background"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b">
                      <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                        <History className="size-3.5" />
                        Draf Asli
                      </span>
                      {selectedChoice === "original" && (
                        <span className="text-[10px] bg-primary text-primary-foreground font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="size-2.5" /> Dipilih
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {currentDraft || "(Draf asli kosong)"}
                    </p>
                  </div>
                </div>

                {/* Hasil AI */}
                <div
                  onClick={() => setSelectedChoice("ai")}
                  className={`border rounded-lg p-3.5 text-xs flex flex-col justify-between cursor-pointer transition-all ${
                    selectedChoice === "ai"
                      ? "ring-2 ring-primary border-primary bg-primary/5"
                      : "hover:border-border/80 bg-background"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b">
                      <span className="font-semibold flex items-center gap-1.5 text-primary">
                        <Sparkles className="size-3.5" />
                        Hasil Poles AI
                      </span>
                      {selectedChoice === "ai" && (
                        <span className="text-[10px] bg-primary text-primary-foreground font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="size-2.5" /> Dipilih
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed font-medium text-foreground">
                      {generatedText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Draf Teks Saat Ini:</p>
              <div className="max-w-lg mx-auto p-3 bg-muted/30 rounded border text-left whitespace-pre-wrap leading-relaxed">
                {currentDraft || "(Belum ada teks draf. AI akan membuatkan draf baru untuk bagian ini)"}
              </div>
              <p className="text-[11px] pt-1">
                Atur opsi mode dan panjang narasi di atas, lalu klik <strong>Poles Sekarang</strong>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
          >
            Batal
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleApply}
            disabled={!generatedText && isNewDraft}
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {selectedChoice === "ai" ? "Terapkan Hasil AI" : "Pertahankan Teks Asli"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

