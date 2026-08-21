import { sanitizeFilenamePart } from "@/lib/reports/pad-report-format";

export function buildBankReportFilename(periodLabel: string): string {
  return `Bank_Statement_${sanitizeFilenamePart(periodLabel)}.xlsx`;
}

export function buildBankReportTitle(periodLabel: string, dateFrom: string, dateTo: string): string {
  return `Bank Statement Report  |  ${periodLabel}  |  ${dateFrom} to ${dateTo}`;
}

export const BANK_SHEET_NAMES = [
  "Summary",
  "Month Cash Flow",
  "Collections",
  "Bank Ledger",
  "Charges and Outflows",
  "Transfer Channels",
  "PAD Reconciliation",
] as const;
