"use client";

import {
  CheckCircle2,
  Eye,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ReportWizardStepperProps {
  reportId: string;
  hasImportBatch?: boolean;
  participantCount?: number;
  selectedParticipantCount?: number;
  pdfCount?: number;
}

export function ReportWizardStepper({
  reportId,
  hasImportBatch = false,
  participantCount = 0,
  selectedParticipantCount = 0,
  pdfCount = 0,
}: ReportWizardStepperProps) {
  const pathname = usePathname();
  const basePath = `/reports/${reportId}`;

  const steps = [
    {
      step: 1,
      label: "Informasi & Petugas",
      description: "Metadata ST & pelapor",
      href: basePath,
      icon: FileText,
      done: true,
      exact: true,
    },
    {
      step: 2,
      label: "Import Excel",
      description: hasImportBatch
        ? `${participantCount} baris terimpor`
        : "Unggah & validasi data",
      href: `${basePath}/import`,
      icon: FileSpreadsheet,
      done: hasImportBatch,
    },
    {
      step: 3,
      label: "Pilih Peserta",
      description:
        selectedParticipantCount > 0
          ? `${selectedParticipantCount} peserta dipilih`
          : "Filter & urutan peserta",
      href: `${basePath}/participants`,
      icon: Users,
      done: selectedParticipantCount > 0,
    },
    {
      step: 4,
      label: "Editor & Narasi AI",
      description: "Bagian A, B, C & Penutup",
      href: `${basePath}/editor`,
      icon: Sparkles,
      done: false,
    },
    {
      step: 5,
      label: "Preview & Export PDF",
      description:
        pdfCount > 0 ? `${pdfCount} versi PDF` : "Cetak dokumen A4",
      href: `${basePath}/preview`,
      icon: Eye,
      done: pdfCount > 0,
    },
  ];

  return (
    <nav
      aria-label="Tahapan pembuatan laporan"
      className="grid gap-2 sm:grid-cols-5"
    >
      {steps.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.step}
            href={item.href}
            className={cn(
              "group flex items-start gap-2.5 rounded-xl border p-3 transition-colors",
              isActive
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : item.done
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {item.done && !isActive ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Tahap {item.step}
                </span>
              </div>
              <p className="truncate text-xs font-semibold text-foreground">
                {item.label}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {item.description}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

