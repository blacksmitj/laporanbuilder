"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type PolishTargetType =
  | "section_a"
  | "section_b_intro"
  | "participant"
  | "section_c"
  | "closing";

export interface ActivePolishTarget {
  targetType: PolishTargetType;
  title: string;
  subtitle?: string;
  currentDraft: string;
  participantId?: string;
  paragraphIndex?: number;
}

export interface PolishSidePanelProps {
  reportId: string;
  activeTarget: ActivePolishTarget | null;
  onApply: (text: string) => void;
}

export function PolishSidePanel({
  reportId,
  activeTarget,
  onApply,
}: PolishSidePanelProps) {
  const [mode, setMode] = useState<"fix" | "enhance">("fix");
  const [lengthOption, setLengthOption] = useState<"short" | "medium" | "detailed">("medium");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset generated text ketika activeTarget berganti
  useEffect(() => {
    setGeneratedText("");
    setErrorMessage(null);
    setCopied(false);
    if (!activeTarget?.currentDraft || activeTarget.currentDraft.trim().length === 0) {
      setMode("enhance");
    }
  }, [activeTarget?.targetType, activeTarget?.paragraphIndex, activeTarget?.participantId]);

  if (!activeTarget) {
    return (
      <Card className="sticky top-6 border-dashed">
        <CardContent className="p-6 text-center text-xs text-muted-foreground space-y-2">
          <Sparkles className="size-6 text-muted-foreground/60 mx-auto" />
          <p className="font-semibold text-foreground">Panel Poles dengan AI</p>
          <p>Pilih salah satu paragraf atau klik tombol "Poles AI" di sebelah kiri untuk mulai memoles draf narasi.</p>
        </CardContent>
      </Card>
    );
  }

  const isDraftEmpty = !activeTarget.currentDraft || activeTarget.currentDraft.trim().length === 0;

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/narratives/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: activeTarget.targetType,
          participantId: activeTarget.participantId,
          paragraphIndex: activeTarget.paragraphIndex,
          currentDraft: activeTarget.currentDraft,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedText.trim()) {
      onApply(generatedText.trim());
    }
  };

  const handleCopy = async () => {
    if (generatedText) {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="sticky top-6 border shadow-sm">
      <CardHeader className="p-3.5 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-xs font-bold text-foreground">
                Poles dengan AI
              </CardTitle>
            </div>
            <div className="text-[11px] font-medium text-primary line-clamp-1">
              Target: {activeTarget.title}
            </div>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full border border-primary/20 whitespace-nowrap">
            Aktif
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3.5 max-h-[calc(100vh-140px)] overflow-y-auto">
        {/* Controls: Mode */}
        <div className="space-y-1.5">
          <FieldLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Mode Polesan
          </FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              type="button"
              variant={mode === "fix" ? "default" : "outline"}
              size="xs"
              className="h-7 text-xs justify-center"
              onClick={() => setMode("fix")}
            >
              <Wand2 className="mr-1.5 size-3" />
              Perbaiki
            </Button>
            <Button
              type="button"
              variant={mode === "enhance" ? "default" : "outline"}
              size="xs"
              className="h-7 text-xs justify-center"
              onClick={() => setMode("enhance")}
            >
              <Sparkles className="mr-1.5 size-3" />
              Sempurnakan
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {mode === "fix"
              ? "Koreksi tata bahasa (EYD/KBBI) & struktur kalimat tanpa merubah fakta."
              : isDraftEmpty
              ? "Draf awal kosong; AI akan menyusun draf narasi baru secara otomatis."
              : "Perkaya substansi, elaborasi konteks, dan penajaman narasi kedinasan."}
          </p>
        </div>

        {/* Controls: Panjang Tulisan */}
        <div className="space-y-1.5">
          <FieldLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Panjang Tulisan
          </FieldLabel>
          <NativeSelect
            value={lengthOption}
            onChange={(e) =>
              setLengthOption(e.target.value as "short" | "medium" | "detailed")
            }
            className="h-7 text-xs"
          >
            <NativeSelectOption value="short">
              Ringkas (2-3 kalimat padat)
            </NativeSelectOption>
            <NativeSelectOption value="medium">
              Sedang (Standar kedinasan, 4-5 kalimat)
            </NativeSelectOption>
            <NativeSelectOption value="detailed">
              Panjang (1-2 paragraf mendalam)
            </NativeSelectOption>
          </NativeSelect>
        </div>

        {/* Controls: Instruksi Tambahan */}
        <div className="space-y-1.5">
          <FieldLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Instruksi Tambahan (Opsional)
          </FieldLabel>
          <Textarea
            rows={2}
            placeholder="Misal: Soroti kemajuan omzet, tekankan aspek pemasaran..."
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            className="text-xs resize-none"
          />
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          size="sm"
          className="w-full h-8 text-xs font-semibold"
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

        {/* Error Message */}
        {errorMessage && (
          <div className="p-2.5 text-[11px] bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
            {errorMessage}
          </div>
        )}

        {/* Hasil AI */}
        {generatedText && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Hasil Polesan AI:
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleCopy}
                className="h-6 text-[10px] px-2"
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
            </div>

            <div className="p-2.5 bg-primary/5 rounded-md border border-primary/20 text-xs leading-relaxed font-medium text-foreground whitespace-pre-wrap">
              {generatedText}
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleApply}
              className="w-full h-8 text-xs font-semibold"
            >
              <Check className="mr-1.5 size-3.5" />
              Terapkan ke Draf
            </Button>
          </div>
        )}

        {/* Preview Current Draft */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <History className="size-3" />
            <span>Draf Saat Ini di Form:</span>
          </div>
          <div className="p-2 rounded bg-muted/40 border text-[11px] text-muted-foreground whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
            {activeTarget.currentDraft || "(Draf masih kosong)"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

