"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ReportWizardStepper } from "@/components/reports/report-wizard-stepper";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { buildLpdMonitoringRegionIntro } from "@/report-types/lpd-monev-tkm/narrative-rules";
import type { LpdMonevTkmNormalizedRow } from "@/report-types/lpd-monev-tkm/row-schema";
import { useReportEditorStore } from "@/stores/report-editor-store";
import {
  UnifiedAiPolishDialog,
  type PolishTargetType,
} from "./unified-ai-polish-dialog";

interface SelectedParticipantItem {
  participantId: string;
  sortOrder: number;
  visitDate: string | null;
  rulesNarrative: string | null;
  aiNarrative: string | null;
  narrative: string | null;
  aiMetadata: {
    model?: string;
    promptVersion?: string;
    durationMs?: number;
    generatedAt?: string;
  } | null;
  normalizedData: Record<string, unknown>;
}

interface ReportEditorViewProps {
  reportId: string;
  reportName: string;
  fiscalYear: number;
  version: number;
  participantCount: number;
  pdfCount: number;
  initialSections: Record<string, Record<string, unknown>>;
  initialNarratives: Record<string, string>;
  participants: SelectedParticipantItem[];
}

export function ReportEditorView({
  reportId,
  reportName,
  fiscalYear,
  version,
  participantCount,
  pdfCount,
  initialSections,
  initialNarratives,
  participants,
}: ReportEditorViewProps) {
  const router = useRouter();

  const {
    sectionContents,
    participantNarratives,
    isDirty,
    saveStatus,
    lastSavedAt,
    initEditor,
    setSectionContent,
    setParticipantNarrative,
    setSaveStatus,
    markSaved,
  } = useReportEditorStore();

  const [activeTab, setActiveTab] = useState<
    "section_a" | "section_b" | "participants" | "section_c" | "section_closing"
  >("section_a");

  const [aiGeneratingPid, setAiGeneratingPid] = useState<string | null>(null);
  const [isPolishingIntroAi, setIsPolishingIntroAi] = useState(false);

  // Unified AI Polish Modal State
  const [polishModal, setPolishModal] = useState<{
    open: boolean;
    targetType: PolishTargetType;
    title: string;
    subtitle?: string;
    currentDraft: string;
    participantId?: string;
    paragraphIndex?: number;
    onApplyCallback?: (text: string) => void;
  }>({
    open: false,
    targetType: "section_a",
    title: "Poles Paragraf dengan AI",
    currentDraft: "",
  });

  // Initialize store on mount
  useEffect(() => {
    initEditor(reportId, initialSections, initialNarratives);
  }, [reportId, initEditor, initialSections, initialNarratives]);

  // Autosave Debounce (3 detik setelah user berhenti mengetik)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveStatus("saving");
      const res = await fetch(`/api/reports/${reportId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionContents,
          participantNarratives,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Gagal menyimpan draf laporan.");
      }
      return json.data;
    },
    onSuccess: () => {
      markSaved();
      toast.add({
        title: "Perubahan Disimpan",
        description: "Draf laporan dan narasi kunjungan berhasil diperbarui.",
        type: "success",
      });
    },
    onError: (err: Error) => {
      setSaveStatus("error");
      toast.add({
        title: "Gagal menyimpan",
        description: err.message,
        type: "error",
      });
    },
  });

  // Trigger autosave when isDirty is true
  useEffect(() => {
    if (!isDirty) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate();
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, sectionContents, participantNarratives, saveMutation]);

  // Generate All Rules Narratives
  const generateRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/narratives/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat narasi.");
      return json.data;
    },
    onSuccess: (data) => {
      toast.add({
        title: "Narasi Otomatis Dibuat",
        description: `${data.count} narasi peserta berhasil disusun berdasarkan aturan fakta.`,
        type: "success",
      });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menyusun narasi",
        description: err.message,
        type: "error",
      });
    },
  });

  // AI Enhance for Single Participant
  async function handleAiEnhance(participantId: string) {
    try {
      setAiGeneratingPid(participantId);
      const res = await fetch(`/api/reports/${reportId}/narratives/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menyempurnakan dengan AI.");

      const enhancedText = json.data.aiNarrative;
      setParticipantNarrative(participantId, enhancedText);

      toast.add({
        title: "Narasi Disempurnakan AI (9router)",
        description: `Struktur kalimat resmi diperhalus (${json.data.aiMetadata?.durationMs || 0}ms).`,
        type: "success",
      });
    } catch (err: unknown) {
      toast.add({
        title: "AI Enhancement Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setAiGeneratingPid(null);
    }
  }

  // Section A Paragraphs
  const sectionAContent = sectionContents["section_a_general"] || {};
  const sectionAParagraphs = Array.isArray(sectionAContent.paragraphs)
    ? (sectionAContent.paragraphs as string[])
    : [];

  function updateSectionAParagraph(index: number, text: string) {
    const copy = [...sectionAParagraphs];
    copy[index] = text;
    setSectionContent("section_a_general", {
      ...sectionAContent,
      paragraphs: copy,
    });
  }

  function addSectionAParagraph() {
    setSectionContent("section_a_general", {
      ...sectionAContent,
      paragraphs: [...sectionAParagraphs, ""],
    });
  }

  function removeSectionAParagraph(index: number) {
    const copy = sectionAParagraphs.filter((_, i) => i !== index);
    setSectionContent("section_a_general", {
      ...sectionAContent,
      paragraphs: copy,
    });
  }

  // Section B Intro & Monitoring Region Intro (Point e)
  const sectionBContent = sectionContents["section_b_summary"] || {};
  const sectionBRegionIntro = String(
    sectionBContent.monitoringRegionIntro || "",
  );
  const sectionBIntro = String(
    sectionBContent.introText ||
      "Adapun Monitoring yang dilakukan dirinci dalam tabel sebagai berikut :",
  );

  function syncRegionFromParticipants() {
    const { pointE, tableIntro } = buildLpdMonitoringRegionIntro(
      participants.map((p) => ({
        normalizedData: p.normalizedData,
      })),
    );
    setSectionContent("section_b_summary", {
      ...sectionBContent,
      monitoringRegionIntro: pointE,
      introText: sectionBIntro || tableIntro,
    });
    toast.add({
      title: "Wilayah Berhasil Disinkronkan",
      description: "Poin e diperbarui berdasarkan kabupaten/kota data peserta.",
      type: "success",
    });
  }

  async function handleAiPolishIntro() {
    const targetText = sectionBRegionIntro.trim();
    if (!targetText) {
      toast.add({
        title: "Teks Kosong",
        description: "Silakan isi atau sinkronkan teks poin e terlebih dahulu.",
        type: "error",
      });
      return;
    }

    try {
      setIsPolishingIntroAi(true);
      const res = await fetch(`/api/reports/${reportId}/narratives/polish-intro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentIntro: targetText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memoles narasi dengan AI.");

      setSectionContent("section_b_summary", {
        ...sectionBContent,
        monitoringRegionIntro: json.data.text,
      });

      toast.add({
        title: "Narasi Poin e Berhasil Dipoles AI",
        description: `Bahasa disempurnakan (${json.data.durationMs || 0}ms).`,
        type: "success",
      });
    } catch (err: unknown) {
      toast.add({
        title: "AI Polish Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        type: "error",
      });
    } finally {
      setIsPolishingIntroAi(false);
    }
  }

  // Section C Paragraphs
  const sectionCContent = sectionContents["section_c_conclusion"] || {};
  const sectionCParagraphs = Array.isArray(sectionCContent.paragraphs)
    ? (sectionCContent.paragraphs as string[])
    : [];

  function updateSectionCParagraph(index: number, text: string) {
    const copy = [...sectionCParagraphs];
    copy[index] = text;
    setSectionContent("section_c_conclusion", {
      ...sectionCContent,
      paragraphs: copy,
    });
  }

  function addSectionCParagraph() {
    setSectionContent("section_c_conclusion", {
      ...sectionCContent,
      paragraphs: [...sectionCParagraphs, ""],
    });
  }

  function removeSectionCParagraph(index: number) {
    const copy = sectionCParagraphs.filter((_, i) => i !== index);
    setSectionContent("section_c_conclusion", {
      ...sectionCContent,
      paragraphs: copy,
    });
  }

  // Closing Paragraph
  const sectionClosingContent = sectionContents["section_closing"] || {};
  const closingText = String(sectionClosingContent.closingParagraph || "");

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
              render={<Link href={`/reports/${reportId}`} />}
            >
              <ArrowLeft className="mr-1 size-3.5" />
              Workspace
            </Button>
            <Badge variant="outline">Tahap 4 — Report Editor</Badge>
            {saveStatus === "saving" && (
              <Badge variant="secondary" className="gap-1 animate-pulse">
                <Loader2 className="size-3 animate-spin" />
                Menyimpan draf...
              </Badge>
            )}
            {saveStatus === "saved" && (
              <Badge variant="outline" className="gap-1 text-emerald-600">
                <CheckCircle2 className="size-3" />
                Tersimpan
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sunting narasi setiap bagian dokumen, generate narasi rules otomatis,
            dan perhalus gaya bahasa menggunakan AI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            Simpan Perubahan
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/reports/${reportId}/preview`} />}
          >
            Lanjut ke Preview &amp; PDF
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>

      <ReportWizardStepper
        reportId={reportId}
        hasImportBatch={participantCount > 0}
        participantCount={participantCount}
        selectedParticipantCount={participants.length}
        pdfCount={pdfCount}
      />

      {/* Editor Main Layout */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Navigasi Section */}
        <div className="space-y-2 lg:col-span-1">
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Bagian Dokumen Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2 pt-0">
              <button
                type="button"
                onClick={() => setActiveTab("section_a")}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                  activeTab === "section_a"
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <span>A. Umum (Latar Belakang)</span>
                <Badge
                  variant={activeTab === "section_a" ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {sectionAParagraphs.length} Paragraf
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("section_b")}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                  activeTab === "section_b"
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <span>B. Pengantar Ringkasan Kegiatan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("participants")}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                  activeTab === "participants"
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <span>Hasil Kunjungan Peserta</span>
                <Badge
                  variant={
                    activeTab === "participants" ? "outline" : "secondary"
                  }
                  className="text-[10px]"
                >
                  {participants.length} Peserta
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("section_c")}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                  activeTab === "section_c"
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <span>C. Kesimpulan Laporan</span>
                <Badge
                  variant={activeTab === "section_c" ? "outline" : "secondary"}
                  className="text-[10px]"
                >
                  {sectionCParagraphs.length} Paragraf
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("section_closing")}
                className={`flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors ${
                  activeTab === "section_closing"
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <span>Penutup &amp; Pernyataan</span>
              </button>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader className="p-3">
              <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
                Otomasi Narasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              <Button
                size="xs"
                variant="outline"
                className="w-full justify-start text-xs"
                disabled={generateRulesMutation.isPending}
                onClick={() => generateRulesMutation.mutate()}
              >
                {generateRulesMutation.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-3.5" />
                )}
                Generate Rules Semua Peserta
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content Editor Panel */}
        <div className="lg:col-span-3">
          {/* TAB: SECTION A */}
          {activeTab === "section_a" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Bagian A — Umum</CardTitle>
                  <CardDescription>
                    Latar belakang, dasar surat tugas, serta maksud dan tujuan
                    monitoring.
                  </CardDescription>
                </div>
                <Button size="xs" variant="outline" onClick={addSectionAParagraph}>
                  <Plus className="mr-1 size-3.5" />
                  Tambah Paragraf
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionAParagraphs.map((par, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Paragraf #{idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          className="h-6 text-[11px] px-2"
                          onClick={() =>
                            setPolishModal({
                              open: true,
                              targetType: "section_a",
                              title: `Bagian A — Paragraf #${idx + 1}`,
                              subtitle: "Poles dan sempurnakan paragraf latar belakang / maksud penugasan.",
                              paragraphIndex: idx,
                              currentDraft: par,
                              onApplyCallback: (text) => {
                                updateSectionAParagraph(idx, text);
                                toast.add({
                                  title: "Paragraf Diperbarui",
                                  description: `Paragraf #${idx + 1} Bagian A berhasil diperbarui.`,
                                  type: "success",
                                });
                              },
                            })
                          }
                        >
                          <Sparkles className="mr-1 size-3 text-primary" />
                          Poles dengan AI
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeSectionAParagraph(idx)}
                          disabled={sectionAParagraphs.length <= 1}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      value={par}
                      onChange={(e) =>
                        updateSectionAParagraph(idx, e.target.value)
                      }
                      placeholder="Ketik isi paragraf umum..."
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB: SECTION B INTRO */}
          {activeTab === "section_b" && (
            <Card>
              <CardHeader>
                <CardTitle>Bagian B — Ringkasan Kegiatan &amp; Lokasi Monitoring</CardTitle>
                <CardDescription>
                  Narasi pengantar hasil penugasan poin e) serta kalimat pengantar sebelum tabel peserta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-sm font-semibold">
                      Poin e) Wilayah Pelaksanaan Monitoring
                    </FieldLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={syncRegionFromParticipants}
                        title="Ekstrak otomatis daftar kabupaten/kota dan provinsi dari data peserta"
                      >
                        <RefreshCw className="mr-1 size-3" />
                        Sinkronkan dari Excel
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setPolishModal({
                            open: true,
                            targetType: "section_b_intro",
                            title: "Bagian B — Narasi Poin e (Hasil Kunjungan Daerah)",
                            subtitle:
                              "Perhalus atau sempurnakan kalimat penutup hasil penugasan monitoring sebelum tabel rincian.",
                            currentDraft: sectionBRegionIntro,
                            onApplyCallback: (text) => {
                              setSectionContent("section_b_summary", {
                                ...sectionBContent,
                                monitoringRegionIntro: text,
                              });
                              toast.add({
                                title: "Narasi Poin e Diperbarui",
                                description: "Hasil poles narasi berhasil disimpan ke draf laporan.",
                                type: "success",
                              });
                            },
                          });
                        }}
                        title="Perhalus dan sempurnakan kalimat poin e dengan AI (Preview Before-After)"
                      >
                        <Sparkles className="mr-1 size-3 text-primary" />
                        Poles dengan AI
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    rows={3}
                    value={sectionBRegionIntro}
                    placeholder="Berkenaan dengan pelaksanaan kegiatan TKM Lanjutan, tim melakukan Monitoring di Kab. Pekalongan, Kota Pekalongan, Kab. Batang, Kab. Tegal dan Kab. Brebes - Provinsi Jawa Tengah;"
                    onChange={(e) =>
                      setSectionContent("section_b_summary", {
                        ...sectionBContent,
                        monitoringRegionIntro: e.target.value,
                      })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Poin ini dicetak sebagai penutup narasi Hasil Penugasan (poin e) sebelum tabel rincian peserta.
                  </p>
                </div>

                <div className="space-y-2">
                  <FieldLabel className="text-sm font-semibold">
                    Kalimat Pengantar Sebelum Tabel Rincian
                  </FieldLabel>
                  <Textarea
                    rows={2}
                    value={sectionBIntro}
                    placeholder="Adapun Monitoring yang dilakukan dirinci dalam tabel sebagai berikut :"
                    onChange={(e) =>
                      setSectionContent("section_b_summary", {
                        ...sectionBContent,
                        introText: e.target.value,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB: HASIL KUNJUNGAN PESERTA */}
          {activeTab === "participants" && (
            <Card>
              <CardHeader className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <CardTitle>
                    Narasi Kunjungan Peserta ({participants.length})
                  </CardTitle>
                  <CardDescription>
                    Teks narasi yang akan dicetak pada kolom ke-5 tabel
                    Ringkasan Hasil Kunjungan.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {participants.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada peserta yang dipilih. Silakan kembali ke Tahap 3
                    (Pilih Peserta).
                  </div>
                ) : (
                  participants.map((p, idx) => {
                    const norm = p.normalizedData as Partial<LpdMonevTkmNormalizedRow>;
                    const currentNarrative =
                      participantNarratives[p.participantId] ??
                      p.narrative ??
                      p.rulesNarrative ??
                      "";

                    const isAiLoading = aiGeneratingPid === p.participantId;

                    return (
                      <div
                        key={p.participantId}
                        className="rounded-xl border bg-muted/20 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{idx + 1}</Badge>
                            <span className="font-semibold text-sm">
                              {String(norm.respondentName ?? "-")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({String(norm.sector ?? "-")} •{" "}
                              {String(norm.businessType ?? "-")})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() =>
                                setPolishModal({
                                  open: true,
                                  targetType: "participant",
                                  title: `Hasil Kunjungan: ${String(norm.respondentName ?? "Peserta")}`,
                                  subtitle: `Poles narasi hasil kunjungan lapangan peserta (${norm.businessType || norm.sector || "Usaha"}).`,
                                  participantId: p.participantId,
                                  currentDraft: currentNarrative,
                                  onApplyCallback: (text) => {
                                    setParticipantNarrative(p.participantId, text);
                                    toast.add({
                                      title: "Narasi Peserta Diperbarui",
                                      description: `Narasi untuk ${String(norm.respondentName ?? "Peserta")} berhasil disimpan.`,
                                      type: "success",
                                    });
                                  },
                                })
                              }
                            >
                              <Sparkles className="mr-1.5 size-3.5 text-primary" />
                              Poles dengan AI
                            </Button>
                          </div>
                        </div>

                        <Textarea
                          rows={4}
                          value={currentNarrative}
                          onChange={(e) =>
                            setParticipantNarrative(
                              p.participantId,
                              e.target.value,
                            )
                          }
                          placeholder="Narasi hasil kunjungan peserta..."
                        />

                        {p.rulesNarrative && (
                          <div className="text-[11px] text-muted-foreground">
                            <span className="font-semibold">Draf Rules:</span>{" "}
                            {p.rulesNarrative}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB: SECTION C */}
          {activeTab === "section_c" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Bagian C — Kesimpulan</CardTitle>
                  <CardDescription>
                    Poin-poin kesimpulan menyeluruh berdasarkan hasil monitoring
                    dan evaluasi.
                  </CardDescription>
                </div>
                <Button size="xs" variant="outline" onClick={addSectionCParagraph}>
                  <Plus className="mr-1 size-3.5" />
                  Tambah Paragraf
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionCParagraphs.map((par, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                      <span>Poin Kesimpulan #{idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          className="h-6 text-[11px] px-2"
                          onClick={() =>
                            setPolishModal({
                              open: true,
                              targetType: "section_c",
                              title: `Bagian C — Poin Kesimpulan #${idx + 1}`,
                              subtitle: "Poles dan sempurnakan rumusan kesimpulan atau evaluasi pelaksanaan.",
                              paragraphIndex: idx,
                              currentDraft: par,
                              onApplyCallback: (text) => {
                                updateSectionCParagraph(idx, text);
                                toast.add({
                                  title: "Kesimpulan Diperbarui",
                                  description: `Poin #${idx + 1} Bagian C berhasil diperbarui.`,
                                  type: "success",
                                });
                              },
                            })
                          }
                        >
                          <Sparkles className="mr-1 size-3 text-primary" />
                          Poles dengan AI
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeSectionCParagraph(idx)}
                          disabled={sectionCParagraphs.length <= 1}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      rows={3}
                      value={par}
                      onChange={(e) =>
                        updateSectionCParagraph(idx, e.target.value)
                      }
                      placeholder="Ketik isi kesimpulan..."
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* TAB: CLOSING & SIGNATURE */}
          {activeTab === "section_closing" && (
            <Card>
              <CardHeader>
                <CardTitle>Penutup Dokumen</CardTitle>
                <CardDescription>
                  Kalimat penutup resmi sebelum kolom tempat, tanggal, dan tanda
                  tangan petugas pelapor.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field>
                  <div className="flex items-center justify-between pb-1">
                    <FieldLabel>Paragraf Penutup</FieldLabel>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="h-6 text-[11px] px-2"
                      onClick={() =>
                        setPolishModal({
                          open: true,
                          targetType: "closing",
                          title: "Bagian Penutup Dokumen",
                          subtitle:
                            "Poles atau sempurnakan kalimat penutup kedinasan sebelum tanda tangan.",
                          currentDraft: closingText,
                          onApplyCallback: (text) => {
                            setSectionContent("section_closing", {
                              ...sectionClosingContent,
                              closingParagraph: text,
                            });
                            toast.add({
                              title: "Paragraf Penutup Diperbarui",
                              description: "Hasil poles penutup berhasil disimpan ke draf laporan.",
                              type: "success",
                            });
                          },
                        })
                      }
                    >
                      <Sparkles className="mr-1 size-3 text-primary" />
                      Poles dengan AI
                    </Button>
                  </div>
                  <Textarea
                    rows={3}
                    value={closingText}
                    onChange={(e) =>
                      setSectionContent("section_closing", {
                        ...sectionClosingContent,
                        closingParagraph: e.target.value,
                      })
                    }
                  />
                </Field>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog Modular Poles dengan AI Terpadu */}
      <UnifiedAiPolishDialog
        open={polishModal.open}
        onOpenChange={(open) => setPolishModal((prev) => ({ ...prev, open }))}
        reportId={reportId}
        targetType={polishModal.targetType}
        title={polishModal.title}
        subtitle={polishModal.subtitle}
        currentDraft={polishModal.currentDraft}
        participantId={polishModal.participantId}
        paragraphIndex={polishModal.paragraphIndex}
        onApply={(text) => {
          if (polishModal.onApplyCallback) {
            polishModal.onApplyCallback(text);
          }
        }}
      />
    </div>
  );
}

