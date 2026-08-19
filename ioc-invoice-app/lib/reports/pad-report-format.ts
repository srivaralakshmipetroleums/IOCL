export function formatReportMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildPadReportFilename(
  periodLabel: string,
  extension: "xlsx" | "pdf"
): string {
  return `PAD_Account_${sanitizeFilenamePart(periodLabel)}.${extension}`;
}

export function buildPadReportTitle(periodLabel: string, dateFrom: string, dateTo: string): string {
  return `PAD Account Report  |  ${periodLabel}  |  ${dateFrom} to ${dateTo}`;
}

export const PAD_SHEET_NAMES = [
  "Summary",
  "Month PnL",
  "Fuel Purchases",
  "PAD Ledger",
  "Charges",
  "Money In",
  "Reconciliation",
  "Retail Prices",
] as const;
