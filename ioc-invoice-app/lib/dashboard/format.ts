export function formatIndianNumber(value: number): string {
  return value.toLocaleString("en-IN");
}

export function formatLakhs(value: number): string {
  return `₹${(value / 100000).toFixed(2)}L`;
}

export function formatKL(litres: number): string {
  return `${(litres / 1000).toFixed(1)} KL`;
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
