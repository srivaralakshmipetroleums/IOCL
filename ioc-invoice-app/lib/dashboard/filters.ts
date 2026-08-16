export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  supplier?: string;
  product?: string;
  months?: string[];
}

export function getDashboardFilters(params: URLSearchParams): DashboardFilters {
  const monthsParam = params.get("months");
  return {
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    supplier: params.get("supplier") || undefined,
    product: params.get("product") || undefined,
    months: monthsParam ? monthsParam.split(",").filter(Boolean) : undefined,
  };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** Inclusive calendar month range using local dates (avoids UTC timezone shifts). */
export function getMonthRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const dateFrom = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${year}-${pad2(month)}-${pad2(lastDay)}`;
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

export function buildDashboardQueryString(period: {
  dateFrom: string;
  dateTo: string;
  months?: string[];
}) {
  const params = new URLSearchParams({
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
  });
  if (period.months?.length) {
    params.set("months", period.months.join(","));
  }
  return params.toString();
}

/** All YYYY-MM keys from dateFrom through dateTo (inclusive), or an explicit months list. */
export function listMonthsInPeriod(
  dateFrom: string,
  dateTo: string,
  allowedMonths?: string[]
): string[] {
  if (allowedMonths?.length) return [...allowedMonths].sort();

  const months: string[] = [];
  const [startYear, startMonth] = dateFrom.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = dateTo.slice(0, 7).split("-").map(Number);

  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}
