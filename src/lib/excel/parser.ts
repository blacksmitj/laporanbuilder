import ExcelJS from "exceljs";
import type { ZodType } from "zod";
import {
  type ColumnFieldSpec,
  lpdMonevTkmColumnSpecs,
  lpdMonevTkmNormalizedHeaderLookup,
} from "@/report-types/lpd-monev-tkm/column-mapping";
import {
  normalizeDateIso,
  normalizeHeaderKey,
  normalizeIdentifierString,
  normalizeInteger,
  normalizePercentage,
  normalizeText,
  normalizeTitleCaseName,
} from "./normalizers";

export interface RowIssue {
  field: string;
  header: string;
  message: string;
}

export interface ParsedExcelRow {
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData: Record<string, unknown>;
  errors: RowIssue[];
  warnings: RowIssue[];
  isValid: boolean;
}

export interface ExcelParseSummary {
  sheetName: string;
  totalRowsRead: number;
  emptyRowsSkipped: number[];
  validRowsCount: number;
  invalidRowsCount: number;
  warningRowsCount: number;
  mappedHeaders: Array<{ header: string; key: string }>;
  unmappedHeaders: string[];
  missingRequiredHeaders: Array<{ key: string; header: string }>;
  duplicateNikWarnings: Array<{ nik: string; rows: number[] }>;
  duplicateTkmIdWarnings: Array<{ tkmId: string; rows: number[] }>;
  rows: ParsedExcelRow[];
}

function extractPlainCellValue(cellValue: ExcelJS.CellValue): unknown {
  if (cellValue === null || cellValue === undefined) return null;
  if (
    typeof cellValue === "string" ||
    typeof cellValue === "number" ||
    typeof cellValue === "boolean" ||
    cellValue instanceof Date
  ) {
    return cellValue;
  }

  if (typeof cellValue === "object") {
    if ("result" in cellValue && cellValue.result !== undefined) {
      return typeof cellValue.result === "object"
        ? null
        : cellValue.result;
    }
    if ("richText" in cellValue && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((part) => part.text).join("");
    }
    if ("text" in cellValue && typeof cellValue.text === "string") {
      return cellValue.text;
    }
    if ("hyperlink" in cellValue && typeof cellValue.hyperlink === "string") {
      return cellValue.hyperlink;
    }
  }

  return String(cellValue);
}

function normalizeValueBySpec(
  rawValue: unknown,
  spec: ColumnFieldSpec,
): { value: unknown; formatError?: string } {
  if (
    rawValue === null ||
    rawValue === undefined ||
    String(rawValue).trim() === ""
  ) {
    return { value: null };
  }

  switch (spec.kind) {
    case "titleName":
      return { value: normalizeTitleCaseName(rawValue) };
    case "identifier":
      return { value: normalizeIdentifierString(rawValue) };
    case "date": {
      const iso = normalizeDateIso(rawValue);
      if (!iso) {
        return {
          value: null,
          formatError: `Format tanggal '${String(rawValue)}' tidak dikenali (gunakan DD/MM/YYYY atau YYYY-MM-DD)`,
        };
      }
      return { value: iso };
    }
    case "integer": {
      const intVal = normalizeInteger(rawValue);
      if (intVal === null) {
        return {
          value: null,
          formatError: `Nilai '${String(rawValue)}' bukan angka bulat yang valid`,
        };
      }
      return { value: intVal };
    }
    case "percentage": {
      const pctVal = normalizePercentage(rawValue);
      if (pctVal === null) {
        return {
          value: null,
          formatError: `Nilai persentase '${String(rawValue)}' tidak valid`,
        };
      }
      return { value: pctVal };
    }
    default:
      return { value: normalizeText(rawValue) };
  }
}

export function revalidateNormalizedRow(
  rowNumber: number,
  rawData: Record<string, unknown>,
  normalizedData: Record<string, unknown>,
  rowSchema?: ZodType,
  formatErrors: RowIssue[] = [],
  existingWarnings: RowIssue[] = [],
): ParsedExcelRow {
  const errors: RowIssue[] = [...formatErrors];
  const warnings: RowIssue[] = [...existingWarnings];

  const headerByKey = new Map(
    lpdMonevTkmColumnSpecs.map((s) => [s.key, s.header]),
  );

  if (rowSchema) {
    const parsed = rowSchema.safeParse(normalizedData);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "unknown");
        if (!errors.some((e) => e.field === field)) {
          errors.push({
            field,
            header: headerByKey.get(field) ?? field,
            message: issue.message,
          });
        }
      }
    }
  }

  // Document reference warnings (PRD §7.3)
  const docFields: Array<{ key: string; label: string }> = [
    { key: "docBusinessPlacePath", label: "Dokumentasi tempat usaha" },
    { key: "docActivityPath", label: "Dokumentasi kegiatan" },
    { key: "docProductPath", label: "Dokumentasi produk" },
    { key: "signaturePath", label: "Tanda Tangan" },
  ];

  for (const docField of docFields) {
    const val = normalizedData[docField.key];
    if (typeof val === "string" && val.length > 0) {
      if (!/\.(jpg|jpeg|png|webp|pdf)$/i.test(val)) {
        warnings.push({
          field: docField.key,
          header: headerByKey.get(docField.key) ?? docField.label,
          message: `Referensi file '${val}' tidak memiliki ekstensi gambar/dokumen standar`,
        });
      }
    }
  }

  return {
    rowNumber,
    rawData,
    normalizedData,
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

export async function parseExcelBuffer(
  buffer: Buffer,
  options?: {
    rowSchema?: ZodType;
    filename?: string;
  },
): Promise<ExcelParseSummary> {
  const workbook = new ExcelJS.Workbook();
  const ext = options?.filename?.toLowerCase() ?? ".xlsx";

  if (ext.endsWith(".csv") || ext.endsWith(".tsv")) {
    const text = buffer.toString("utf-8");
    return parseDelimitedText(text, options?.rowSchema);
  }

  // Try loading as XLSX workbook first; if user uploaded a TSV/CSV with .xls extension, fall back gracefully
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    const textFallback = buffer.toString("utf-8");
    if (textFallback.includes("\t") || textFallback.includes(";")) {
      return parseDelimitedText(textFallback, options?.rowSchema);
    }
    throw new Error(
      "File Excel tidak dapat dibaca. Pastikan file berformat .xlsx yang valid.",
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Tidak ditemukan lembar kerja (worksheet) di dalam file Excel.");
  }

  // Detect header row (first non-empty row within row 1..10)
  let headerRowNumber = 1;
  const colIndexToHeader = new Map<number, string>();

  for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    const candidateHeaders = new Map<number, string>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const plain = extractPlainCellValue(cell.value);
      const str = normalizeText(plain);
      if (str) {
        candidateHeaders.set(colNumber, str);
      }
    });

    if (candidateHeaders.size >= 3) {
      headerRowNumber = r;
      for (const [col, h] of candidateHeaders.entries()) {
        colIndexToHeader.set(col, h);
      }
      break;
    }
  }

  if (colIndexToHeader.size === 0) {
    throw new Error("Baris header kolom tidak ditemukan pada file Excel.");
  }

  return processExtractedRows({
    sheetName: worksheet.name,
    colIndexToHeader,
    totalSheetRows: worksheet.rowCount,
    headerRowNumber,
    getRowCells: (rowNum) => {
      const row = worksheet.getRow(rowNum);
      const map = new Map<number, unknown>();
      for (const colNum of colIndexToHeader.keys()) {
        const cell = row.getCell(colNum);
        // For identifier columns (NIK / phone), prefer cell.text if cell.value is a rounded number
        const val = extractPlainCellValue(cell.value);
        map.set(colNum, val);
      }
      return map;
    },
    rowSchema: options?.rowSchema,
  });
}

function parseDelimitedText(
  text: string,
  rowSchema?: ZodType,
): ExcelParseSummary {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("File kosong.");
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headerParts = lines[0].split(delimiter);
  const colIndexToHeader = new Map<number, string>();

  headerParts.forEach((h, idx) => {
    const trimmed = h.trim();
    if (trimmed) {
      colIndexToHeader.set(idx + 1, trimmed);
    }
  });

  return processExtractedRows({
    sheetName: "Sheet1",
    colIndexToHeader,
    totalSheetRows: lines.length,
    headerRowNumber: 1,
    getRowCells: (rowNum) => {
      const line = lines[rowNum - 1] ?? "";
      const parts = line.split(delimiter);
      const map = new Map<number, unknown>();
      for (const colNum of colIndexToHeader.keys()) {
        map.set(colNum, parts[colNum - 1] ?? null);
      }
      return map;
    },
    rowSchema,
  });
}

function processExtractedRows(params: {
  sheetName: string;
  colIndexToHeader: Map<number, string>;
  totalSheetRows: number;
  headerRowNumber: number;
  getRowCells: (rowNum: number) => Map<number, unknown>;
  rowSchema?: ZodType;
}): ExcelParseSummary {
  const {
    sheetName,
    colIndexToHeader,
    totalSheetRows,
    headerRowNumber,
    getRowCells,
    rowSchema,
  } = params;

  const colIndexToSpec = new Map<number, ColumnFieldSpec>();
  const mappedHeaders: Array<{ header: string; key: string }> = [];
  const unmappedHeaders: string[] = [];
  const foundKeys = new Set<string>();

  for (const [colNum, headerText] of colIndexToHeader.entries()) {
    const normalizedH = normalizeHeaderKey(headerText);
    const spec = lpdMonevTkmNormalizedHeaderLookup.get(normalizedH);
    if (spec) {
      colIndexToSpec.set(colNum, spec);
      mappedHeaders.push({ header: headerText, key: spec.key });
      foundKeys.add(spec.key);
    } else {
      unmappedHeaders.push(headerText);
    }
  }

  const missingRequiredHeaders = lpdMonevTkmColumnSpecs
    .filter((s) => s.required && !foundKeys.has(s.key))
    .map((s) => ({ key: s.key, header: s.header }));

  const emptyRowsSkipped: number[] = [];
  const rows: ParsedExcelRow[] = [];

  for (let r = headerRowNumber + 1; r <= totalSheetRows; r++) {
    const cellMap = getRowCells(r);
    const rawData: Record<string, unknown> = {};
    const normalizedData: Record<string, unknown> = {};
    const formatErrors: RowIssue[] = [];
    let hasNonEmptyValue = false;

    for (const [colNum, headerText] of colIndexToHeader.entries()) {
      const rawVal = cellMap.get(colNum) ?? null;
      const serializedRaw =
        rawVal instanceof Date ? rawVal.toISOString() : rawVal;
      rawData[headerText] = serializedRaw;

      if (
        rawVal !== null &&
        rawVal !== undefined &&
        String(rawVal).trim() !== ""
      ) {
        hasNonEmptyValue = true;
      }

      const spec = colIndexToSpec.get(colNum);
      if (spec) {
        const { value, formatError } = normalizeValueBySpec(rawVal, spec);
        normalizedData[spec.key] = value;
        if (formatError) {
          formatErrors.push({
            field: spec.key,
            header: spec.header,
            message: formatError,
          });
        }
      }
    }

    if (!hasNonEmptyValue) {
      emptyRowsSkipped.push(r);
      continue;
    }

    // Ensure all spec keys exist in normalizedData (null when column absent)
    for (const spec of lpdMonevTkmColumnSpecs) {
      if (!(spec.key in normalizedData)) {
        normalizedData[spec.key] = null;
      }
    }

    const parsedRow = revalidateNormalizedRow(
      r,
      rawData,
      normalizedData,
      rowSchema,
      formatErrors,
    );
    rows.push(parsedRow);
  }

  // Duplicate detection for NIK and ID TKM (PRD §7.3)
  const nikMap = new Map<string, number[]>();
  const tkmIdMap = new Map<string, number[]>();

  for (const row of rows) {
    const nik = row.normalizedData.nik;
    if (typeof nik === "string" && nik.length > 0) {
      const list = nikMap.get(nik) ?? [];
      list.push(row.rowNumber);
      nikMap.set(nik, list);
    }

    const tkmId = row.normalizedData.tkmId;
    if (typeof tkmId === "string" && tkmId.length > 0) {
      const list = tkmIdMap.get(tkmId) ?? [];
      list.push(row.rowNumber);
      tkmIdMap.set(tkmId, list);
    }
  }

  const duplicateNikWarnings: Array<{ nik: string; rows: number[] }> = [];
  for (const [nik, rowNums] of nikMap.entries()) {
    if (rowNums.length > 1) {
      duplicateNikWarnings.push({ nik, rows: rowNums });
      for (const row of rows) {
        if (row.normalizedData.nik === nik) {
          row.warnings.push({
            field: "nik",
            header: "NIK Responden",
            message: `NIK duplikat ditemukan pada baris ${rowNums.join(", ")}`,
          });
        }
      }
    }
  }

  const duplicateTkmIdWarnings: Array<{ tkmId: string; rows: number[] }> = [];
  for (const [tkmId, rowNums] of tkmIdMap.entries()) {
    if (rowNums.length > 1) {
      duplicateTkmIdWarnings.push({ tkmId, rows: rowNums });
      for (const row of rows) {
        if (row.normalizedData.tkmId === tkmId) {
          row.warnings.push({
            field: "tkmId",
            header: "ID TKM Lanjutan Responden",
            message: `ID TKM duplikat ditemukan pada baris ${rowNums.join(", ")}`,
          });
        }
      }
    }
  }

  const validRowsCount = rows.filter((r) => r.isValid).length;
  const invalidRowsCount = rows.length - validRowsCount;
  const warningRowsCount = rows.filter((r) => r.warnings.length > 0).length;

  return {
    sheetName,
    totalRowsRead: rows.length,
    emptyRowsSkipped,
    validRowsCount,
    invalidRowsCount,
    warningRowsCount,
    mappedHeaders,
    unmappedHeaders,
    missingRequiredHeaders,
    duplicateNikWarnings,
    duplicateTkmIdWarnings,
    rows,
  };
}

