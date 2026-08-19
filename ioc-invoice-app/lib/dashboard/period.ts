import { getLastNCalendarMonths, MONTHS } from "@/lib/invoices/period-utils";
import { getMonthRange, monthLabelFromRange } from "@/lib/dashboard/filters";

export type DashboardPeriodMode =
  | "currentMonth"
  | "month"
  | "last6months"
  | "financialYear"
  | "range"
  | "multiMonth";

export interface DashboardPeriod {
  mode: DashboardPeriodMode;
  dateFrom: string;
  dateTo: string;
  label: string;
  /** YYYY-MM values — used to include only specific months inside the envelope range */
  months?: string[];
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getCurrentMonthPeriod(now = new Date()): DashboardPeriod {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const range = getMonthRange(year, month);
  return {
    mode: "currentMonth",
    ...range,
    label: monthLabelFromRange(range.dateFrom),
  };
}

export function getSelectedMonthPeriod(year: number, month: number): DashboardPeriod {
  const range = getMonthRange(year, month);
  return {
    mode: "month",
    ...range,
    label: monthLabelFromRange(range.dateFrom),
  };
}

export function getLast6MonthsPeriod(now = new Date()): DashboardPeriod {
  const calendarMonths = getLastNCalendarMonths(6, now);
  const first = calendarMonths[0];
  const last = calendarMonths[calendarMonths.length - 1];
  const dateFrom = getMonthRange(first.year, first.month).dateFrom;
  const dateTo = getMonthRange(last.year, last.month).dateTo;

  return {
    mode: "last6months",
    dateFrom,
    dateTo,
    label: "Last 6 months",
    months: calendarMonths.map((m) => monthKey(m.year, m.month)),
  };
}

export function getFinancialYearStartYear(now = new Date()): number {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 4 ? year : year - 1;
}

export function getFinancialYearPeriod(fyStartYear: number): DashboardPeriod {
  return {
    mode: "financialYear",
    dateFrom: `${fyStartYear}-04-01`,
    dateTo: `${fyStartYear + 1}-03-31`,
    label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
  };
}

export function getCustomRangePeriod(dateFrom: string, dateTo: string): DashboardPeriod {
  return {
    mode: "range",
    dateFrom,
    dateTo,
    label: `${dateFrom} to ${dateTo}`,
  };
}

export function getMultiMonthPeriod(selectedMonths: string[]): DashboardPeriod | null {
  if (!selectedMonths.length) return null;

  const sorted = [...selectedMonths].sort();
  const [firstYear, firstMonth] = sorted[0].split("-").map(Number);
  const [lastYear, lastMonth] = sorted[sorted.length - 1].split("-").map(Number);
  const dateFrom = getMonthRange(firstYear, firstMonth).dateFrom;
  const dateTo = getMonthRange(lastYear, lastMonth).dateTo;

  const labels = sorted.map((key) => {
    const [year, month] = key.split("-").map(Number);
    return monthLabelFromRange(getMonthRange(year, month).dateFrom);
  });

  return {
    mode: "multiMonth",
    dateFrom,
    dateTo,
    label: labels.length <= 3 ? labels.join(", ") : `${labels.length} months selected`,
    months: sorted,
  };
}

export function getFinancialYearOptions(now = new Date()): number[] {
  const current = getFinancialYearStartYear(now);
  const earliest = 2020;
  const years: number[] = [];
  for (let year = earliest; year <= current; year++) {
    years.push(year);
  }
  return years;
}

export function getRecentMonthOptions(count = 18, now = new Date()) {
  return getLastNCalendarMonths(count, now)
    .map((m) => ({
      key: monthKey(m.year, m.month),
      label: m.label,
    }))
    .reverse();
}

export function getPreviousComparisonPeriod(period: DashboardPeriod): DashboardPeriod | null {
  if (period.mode === "month" || period.mode === "currentMonth") {
    const [year, month] = period.dateFrom.split("-").map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return getSelectedMonthPeriod(prevYear, prevMonth);
  }

  if (period.mode === "last6months") {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const calendarMonths = getLastNCalendarMonths(6, sixMonthsAgo);
    const first = calendarMonths[0];
    const last = calendarMonths[calendarMonths.length - 1];
    return {
      mode: "last6months",
      dateFrom: getMonthRange(first.year, first.month).dateFrom,
      dateTo: getMonthRange(last.year, last.month).dateTo,
      label: "Previous 6 months",
      months: calendarMonths.map((m) => monthKey(m.year, m.month)),
    };
  }

  if (period.mode === "financialYear") {
    const fyStartYear = Number(period.dateFrom.slice(0, 4));
    return getFinancialYearPeriod(fyStartYear - 1);
  }

  return null;
}

export { MONTHS };
