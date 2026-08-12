export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  supplier?: string;
  product?: string;
}

export function getDashboardFilters(params: URLSearchParams): DashboardFilters {
  return {
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    supplier: params.get("supplier") || undefined,
    product: params.get("product") || undefined,
  };
}

export function getMonthRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const dateFrom = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const dateTo = new Date(year, month, 0).toISOString().split("T")[0];
  return { dateFrom, dateTo };
}

export function getCurrentMonthRange(): { dateFrom: string; dateTo: string; monthLabel: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { dateFrom, dateTo } = getMonthRange(year, month);
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return { dateFrom, dateTo, monthLabel };
}

export function monthInputValue(dateFrom: string): string {
  return dateFrom.slice(0, 7);
}

export function monthLabelFromRange(dateFrom: string): string {
  const [year, month] = dateFrom.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
