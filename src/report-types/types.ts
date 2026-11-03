import type { ZodType } from "zod";

export type ReportDataSource = "excel" | "manual" | "none";

export type MetadataFieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "select";

export interface MetadataFieldOption {
  label: string;
  value: string;
}

export interface MetadataFieldDescriptor {
  name: string;
  label: string;
  type: MetadataFieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  colSpan?: 1 | 2;
  options?: MetadataFieldOption[];
}

export interface ReportSectionDefinition {
  key: string;
  title: string;
  description: string;
  defaultOrder: number;
  required: boolean;
  defaultContent?: Record<string, unknown>;
}

export interface NarrativeRule<TRow = Record<string, unknown>> {
  id: string;
  label: string;
  build: (row: TRow) => string | null;
}

export interface AiPromptConfig {
  version: string;
  systemPrompt: string;
  style: string;
  constraints: string[];
  allowedFactKeys: string[];
}

export interface TemplateHeaderConfig {
  showKop: boolean;
  ministryName: string;
  directorateName: string;
  institutionName: string;
  institutionAddress: string;
  institutionContact?: string;
  logoStorageKey?: string | null;
  reportTitle: string;
  titleFontFamily?: string;
  titleFontSizePt?: number;
  titleFontWeight?: "normal" | "bold" | "500" | "600";
  titleLetterSpacing?: string;

  // Tipografi Khusus Judul Kop Surat / Cover Atas
  ministryFontFamily?: string;
  ministryFontSizePt?: number;
  ministryFontWeight?: "normal" | "bold" | "500" | "600";
  directorateFontFamily?: string;
  directorateFontSizePt?: number;
  directorateFontWeight?: "normal" | "bold" | "500" | "600";
  institutionFontFamily?: string;
  institutionFontSizePt?: number;
  institutionFontWeight?: "normal" | "bold" | "500" | "600";

  // Margin Khusus Kop Surat (mm dari tepi kertas)
  kopMarginsMm?: {
    top: number;
    left: number;
    right: number;
  };
}

export interface TemplatePageConfig {
  paperSize: "A4";
  orientation: "portrait" | "landscape";
  fontFamily: string;
  fontSizePt: number;
  lineHeight: number;
  marginsMm: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showPageNumbers: boolean;
}

export interface TemplateConfiguration {
  header: TemplateHeaderConfig;
  page: TemplatePageConfig;
  enabledSections: string[];
  sectionOrder: string[];
  standardNarratives: Record<string, string>;
  dateFormat: string;
  currencyPrefix: string;
  signatureCityDefault: string;
}

export interface ReportTypeDefinition<
  TMeta = Record<string, unknown>,
  TRow = Record<string, unknown>,
> {
  key: string;
  name: string;
  shortName: string;
  description: string;
  version: number;
  isActive: boolean;
  dataSource: ReportDataSource;
  metadataSchema: ZodType<TMeta>;
  defaultMetadata: TMeta;
  metadataFields: MetadataFieldDescriptor[];
  rowSchema?: ZodType<TRow>;
  columnMapping?: Record<string, string>;
  sections: ReportSectionDefinition[];
  narrativeRules?: NarrativeRule<TRow>[];
  aiPromptConfig?: AiPromptConfig;
  defaultTemplate: TemplateConfiguration;
}

