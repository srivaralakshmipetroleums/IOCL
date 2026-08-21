export function formatIndianNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

export const LAKH = 100_000;
const CRORE = 10_000_000;

export function formatLakhs(value: number): string {
  return `₹${truncateToDecimals(value / LAKH, 2).toFixed(2)} L`;
}

/** Truncate toward zero (do not round up crore display). */
export function truncateToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.trunc(value * factor) / factor;
}

/** Standard ₹/L rounding: 2.5854 → 2.59, 2.5844 → 2.58 */
export function roundRatePerLitre(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Round INR amounts to paise. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function fuelSpreadPerLitre(
  retailPerL: number | null | undefined,
  purchasePerL: number | null | undefined
): number | null {
  if (retailPerL == null || purchasePerL == null) return null;
  return roundRatePerLitre(retailPerL - purchasePerL);
}

export function fuelMarginFromSpread(spreadPerL: number | null, litres: number): number | null {
  if (spreadPerL == null) return null;
  return roundMoney(roundRatePerLitre(spreadPerL) * litres);
}

/** Format large INR values in crores for dashboard KPIs (e.g. ₹1.56 Cr — truncated, not rounded up). */
export function formatCrores(value: number): string {
  const crores = value / CRORE;
  if (Math.abs(crores) >= 1) {
    const truncated = truncateToDecimals(crores, 2);
    return `₹${truncated.toFixed(2)} Cr`;
  }

  return `₹${formatIndianNumber(Math.round(value))}`;
}

export function formatChartCrores(value: number): string {
  const truncated = truncateToDecimals(value, 2);
  return `₹${truncated.toFixed(2)} Cr`;
}

export interface MoneyKpiDisplay {
  primary: string;
  fullAmount?: string;
}

/**
 * Indian money for reports: crores, then lakhs, then rupees.
 * Never uses million/billion grouping.
 */
export function formatIndianCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= CRORE) {
    return `${sign}₹${truncateToDecimals(abs / CRORE, 2).toFixed(2)} Cr`;
  }
  if (abs >= LAKH) {
    return `${sign}₹${truncateToDecimals(abs / LAKH, 2).toFixed(2)} L`;
  }
  return `${sign}₹${formatIndianNumber(Math.round(abs))}`;
}

/** Crore/lakh headline + full INR below when the compact unit is used. */
export function formatMoneyKpi(value: number): MoneyKpiDisplay {
  if (Math.abs(value) >= CRORE) {
    return {
      primary: formatCrores(value),
      fullAmount: formatCurrencyINR(value),
    };
  }
  if (Math.abs(value) >= LAKH) {
    return {
      primary: formatIndianCompact(value),
      fullAmount: formatCurrencyINR(value),
    };
  }
  return { primary: formatCurrencyINR(value) };
}

/** Chart tooltips and PAD dashboard money labels. */
export function formatDashboardMoney(value: number): string {
  return formatMoneyKpi(value).primary;
}

export function formatKL(litres: number): string {
  return `${(litres / 1000).toFixed(1)} KL`;
}

export function formatPricePerLitre(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${roundRatePerLitre(value).toFixed(2)}/L`;
}

export function formatCurrencyINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatChartLakhs(value: number): string {
  return `₹${truncateToDecimals(value / 100000, 1).toFixed(1)}L`;
}
