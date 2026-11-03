/**
 * Helper functions to normalize raw Excel values according to PRD §19:
 * - Dates stored in ISO format (YYYY-MM-DD)
 * - Currency/Rupiah stored as integer
 * - Percentages stored as consistent numeric value
 * - Ya/Tidak normalized to boolean (while keeping raw text where needed)
 * - Empty strings converted to null (never treated as 0)
 */

export function normalizeHeaderKey(header: string): string {
  return header
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035`]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return normalizeDateIso(value);
  }
  const str = String(value).replace(/\s+/g, " ").trim();
  return str.length === 0 ? null : str;
}

export function normalizeTitleCaseName(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  return text
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      if (word === word.toUpperCase() && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Preserves long numeric identifiers (such as 16-digit NIK or phone numbers)
 * as exact strings without scientific notation or decimal artifacts.
 */
export function normalizeIdentifierString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.trunc(value).toString();
  }
  const str = String(value).trim();
  if (str.length === 0) return null;
  const cleaned = str.replace(/^'+/, "").trim();
  return cleaned.length === 0 ? null : cleaned;
}

export function normalizeDateIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date number (days since 1899-12-30)
    if (value > 20000 && value < 80000) {
      const utcDays = Math.floor(value - 25569);
      const ms = utcDays * 86400 * 1000;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  const str = String(value).trim();
  if (str.length === 0) return null;

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    const iso = `${year}-${month}-${day}`;
    const parsed = new Date(`${iso}T00:00:00Z`);
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() + 1 === Number(month) &&
      parsed.getUTCDate() === Number(day)
    ) {
      return iso;
    }
    return null;
  }

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    const iso = `${year}-${month}-${day}`;
    const parsed = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return iso;
    }
  }

  return null;
}

/**
 * Converts currency / integer strings into integer numbers.
 * Empty values return null (never 0, per PRD §7.3).
 */
export function normalizeInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  const str = String(value).trim();
  if (str.length === 0) return null;

  // Extract digits and minus sign (e.g. "1 kali" -> 1, "Rp 15.000.000" -> 15000000)
  const visitMatch = str.match(/^(\d+)\s*kali$/i);
  if (visitMatch) {
    return Number.parseInt(visitMatch[1], 10);
  }

  const cleaned = str
    .replace(/rp\.?/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");

  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }

  const num = Number(cleaned);
  return Number.isFinite(num) ? Math.round(num) : null;
}

export function normalizePercentage(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Excel often stores 25% as 0.25
    if (value > 0 && value <= 1) {
      return Number((value * 100).toFixed(2));
    }
    return Number(value.toFixed(2));
  }
  const str = String(value).trim();
  if (str.length === 0) return null;

  const cleaned = str.replace(/%/g, "").replace(/,/g, ".").trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : null;
}

export function normalizeBooleanYesNo(value: unknown): boolean | null {
  const text = normalizeText(value);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (
    lower === "ya" ||
    lower === "iya" ||
    lower === "sudah" ||
    lower === "sudah dapat" ||
    lower === "ada" ||
    lower === "sesuai" ||
    lower === "valid" ||
    lower === "true"
  ) {
    return true;
  }
  if (
    lower === "tidak" ||
    lower === "belum" ||
    lower === "tidak ada" ||
    lower === "tidak sesuai" ||
    lower === "tidak valid" ||
    lower === "false"
  ) {
    return false;
  }
  return null;
}

