import { lpdMonevTkmDefinition } from "./lpd-monev-tkm/definition";
import type { ReportTypeDefinition } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reportTypeRegistry: Record<string, ReportTypeDefinition<any, any>> = {
  [lpdMonevTkmDefinition.key]: lpdMonevTkmDefinition,
};

export function listReportTypes(): ReportTypeDefinition[] {
  return Object.values(reportTypeRegistry);
}

export function getReportType(
  key: string,
): ReportTypeDefinition | undefined {
  return reportTypeRegistry[key];
}

export function requireReportType(key: string): ReportTypeDefinition {
  const def = reportTypeRegistry[key];
  if (!def) {
    throw new Error(`Jenis laporan '${key}' tidak terdaftar pada registry.`);
  }
  return def;
}

