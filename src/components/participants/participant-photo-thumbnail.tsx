"use client";

import { useEffect, useState } from "react";
import { Upload, ZoomIn } from "lucide-react";
import {
  getOptimizedImageUrl,
  getMediaProxyUrl,
  isGoogleDriveUrl,
} from "@/lib/media/google-drive-url";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ParticipantPhotoThumbnailProps {
  label: string;
  fullLabel: string;
  participantName: string;
  rawSrc?: string | null;
  onUpload: () => void;
  onPreview: (src: string, title: string, rawSrc?: string | null) => void;
}

export function ParticipantPhotoThumbnail({
  label,
  fullLabel,
  participantName,
  rawSrc,
  onUpload,
  onPreview,
}: ParticipantPhotoThumbnailProps) {
  const [useProxyFallback, setUseProxyFallback] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  // Reset fallback and failure state whenever rawSrc changes
  useEffect(() => {
    setUseProxyFallback(false);
    setHasFailed(false);
  }, [rawSrc]);

  const hasPhoto = Boolean(rawSrc && rawSrc.trim());

  let currentSrc = rawSrc ?? "";
  if (hasPhoto) {
    if (useProxyFallback) {
      currentSrc = getMediaProxyUrl(rawSrc) ?? rawSrc ?? "";
    } else {
      currentSrc = getOptimizedImageUrl(rawSrc) ?? rawSrc ?? "";
    }
  }

  const handleError = () => {
    if (!useProxyFallback && isGoogleDriveUrl(rawSrc)) {
      setUseProxyFallback(true);
    } else {
      setHasFailed(true);
    }
  };

  const previewTitle = `Foto ${fullLabel} — ${participantName}`;

  // 1. Empty state: photo not yet uploaded
  if (!hasPhoto) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onUpload}
                className="group relative flex size-14 sm:size-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-muted-foreground transition-all hover:border-primary hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Unggah foto ${fullLabel.toLowerCase()} untuk ${participantName}`}
              />
            }
          >
            <Upload className="size-4.5 transition-transform duration-150 group-hover:scale-110" />
          </TooltipTrigger>
          <TooltipContent side="top">
            Unggah Foto {fullLabel}
          </TooltipContent>
        </Tooltip>
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
    );
  }

  // 2. Failed state: image link unreadable / broken
  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={onUpload}
                className="group relative flex size-14 sm:size-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-all hover:border-amber-500 hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Foto ${fullLabel.toLowerCase()} tidak terbaca. Klik untuk unggah ulang.`}
              />
            }
          >
            <div className="relative">
              <Upload className="size-4.5 transition-transform duration-150 group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500 ring-2 ring-background" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-center text-xs">
            Foto tidak terbaca — klik untuk unggah ulang atau perbaiki link
          </TooltipContent>
        </Tooltip>
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">{label}</span>
      </div>
    );
  }

  // 3. Normal loaded photo state with hover overlay
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onPreview(currentSrc, previewTitle, rawSrc)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPreview(currentSrc, previewTitle, rawSrc);
          }
        }}
        className="group relative size-14 sm:size-16 cursor-pointer overflow-hidden rounded-lg border border-border/80 bg-muted/30 shadow-2xs transition-all hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={previewTitle}
          onError={handleError}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
        />

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-1 sm:gap-1.5 bg-black/60 p-1 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(currentSrc, previewTitle, rawSrc);
                  }}
                  className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-colors hover:bg-white/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                  aria-label="Perbesar foto"
                />
              }
            >
              <ZoomIn className="size-3 sm:size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">Perbesar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpload();
                  }}
                  className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs transition-colors hover:bg-white/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                  aria-label="Ganti foto"
                />
              }
            >
              <Upload className="size-3 sm:size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="top">Ganti foto</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

