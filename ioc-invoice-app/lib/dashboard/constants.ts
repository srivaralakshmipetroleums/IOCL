/** Invoice statuses included in dashboard analytics */
export const DASHBOARD_INVOICE_STATUSES = ["EXTRACTED", "NEEDS_REVIEW", "APPROVED"] as const;

/** Chart palette — maps to IOC corporate colours */
export const IOC_CHART = {
  primary: "var(--ioc-navy)",
  secondary: "var(--ioc-blue)",
  accent: "var(--ioc-orange)",
  supporting: "var(--ioc-mid-blue)",
  ebms: "var(--ioc-navy)",
  hsd: "var(--ioc-orange)",
} as const;

export const CHART_COLORS = [
  IOC_CHART.primary,
  IOC_CHART.accent,
  IOC_CHART.secondary,
  IOC_CHART.supporting,
];

export function productChartColor(product: string, index: number): string {
  const upper = product.toUpperCase();
  if (upper.includes("EBMS")) return IOC_CHART.ebms;
  if (upper.includes("HSD")) return IOC_CHART.hsd;
  return CHART_COLORS[index % CHART_COLORS.length];
}
