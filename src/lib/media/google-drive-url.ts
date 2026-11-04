/**
 * Utility to extract Google Drive file ID and convert share links
 * to direct thumbnail / embeddable image URLs.
 */

export function extractGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Pattern: /file/d/[id]
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Pattern: id=[id]
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Pattern: /open?id=[id]
  const openMatch = trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) return openMatch[1];

  // Pattern: /thumbnail?id=[id] or /d/[id]
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch && dMatch[1]) return dMatch[1];

  return null;
}

export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return /drive\.google\.com|drive\.usercontent\.google\.com|googleusercontent\.com/.test(url);
}

/**
 * Returns a direct thumbnail image URL for Google Drive, or the original url if not Google Drive.
 */
export function getOptimizedImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    // Official Google Drive thumbnail endpoint supporting high-res preview
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
  }

  return trimmed;
}

/**
 * Returns our internal server proxy URL for remote images (to bypass CORS/hotlink protection).
 */
export function getMediaProxyUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  return `/api/media-proxy?url=${encodeURIComponent(trimmed)}`;
}

