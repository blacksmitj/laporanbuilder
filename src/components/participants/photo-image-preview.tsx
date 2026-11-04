"use client";

import { useEffect, useState } from "react";
import {
  getOptimizedImageUrl,
  getMediaProxyUrl,
  isGoogleDriveUrl,
} from "@/lib/media/google-drive-url";

interface PhotoImagePreviewProps {
  src?: string | null;
  file?: File | null;
  alt: string;
  className?: string;
}

export function PhotoImagePreview({
  src,
  file,
  alt,
  className,
}: PhotoImagePreviewProps) {
  const [fileUrl, setFileUrl] = useState<{ file: File; url: string } | null>(null);
  const [useProxyFallback, setUseProxyFallback] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  // Reset fallback and failure state whenever src or file changes
  useEffect(() => {
    setUseProxyFallback(false);
    setHasFailed(false);
  }, [src, file]);

  useEffect(() => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    // Object URL creation is an external browser side effect; retain it for this file.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFileUrl({ file, url: nextUrl });
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const rawSrc = file ? (fileUrl?.file === file ? fileUrl.url : null) : src;

  if (!rawSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/40 p-2 text-center text-xs text-muted-foreground ${className ?? ""}`}
        role="status"
      >
        Belum ada foto
      </div>
    );
  }

  if (hasFailed) {
    return (
      <div
        className={`flex flex-col items-center justify-center border border-dashed border-destructive/40 bg-destructive/5 p-3 text-center text-xs text-destructive ${className ?? ""}`}
        role="status"
      >
        <span className="font-medium">Gambar tidak bisa ditampilkan</span>
        {isGoogleDriveUrl(rawSrc) && (
          <span className="mt-1 text-[11px] text-muted-foreground">
            Pastikan akses Google Drive diset &ldquo;Siapa saja yang memiliki link&rdquo;.
          </span>
        )}
      </div>
    );
  }

  // Determine current image URL candidate:
  // 1. If uploaded File: use object URL directly.
  // 2. If proxy fallback active: use /api/media-proxy.
  // 3. Otherwise: optimize Google Drive direct thumbnail URL.
  let currentSrc = rawSrc;
  if (!file) {
    if (useProxyFallback) {
      currentSrc = getMediaProxyUrl(rawSrc) ?? rawSrc;
    } else {
      currentSrc = getOptimizedImageUrl(rawSrc) ?? rawSrc;
    }
  }

  const handleError = () => {
    // If not using proxy yet and it's a remote URL, try internal proxy fallback
    if (!file && !useProxyFallback && isGoogleDriveUrl(rawSrc)) {
      setUseProxyFallback(true);
    } else {
      setHasFailed(true);
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
