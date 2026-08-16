export function formatIndianNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

export function formatLakhs(value: number): string {
  return `₹${(value / 100000).toFixed(2)}L`;
}

/** Format large INR values in crores for dashboard KPIs (e.g. ₹1.43 Cr). */
export function formatCrores(value: number): string {
  const crores = value / 10000000;
  if (crores >= 1) {
    return `₹${crores.toFixed(2)} Cr`;
  }

  return `₹${formatIndianNumber(Math.round(value))}`;
}

export function formatChartCrores(value: number): string {
  return `₹${(value / 10000000).toFixed(2)} Cr`;
}

export function formatKL(litres: number): string {
  return `${(litres / 1000).toFixed(1)} KL`;
}

export function formatPricePerLitre(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹${value.toFixed(2)}/L`;
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
  return `₹${(value / 100000).toFixed(1)}L`;
}
