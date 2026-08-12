export type PeriodMode = "month" | "year" | "range";

export interface DatePeriod {
  dateFrom: string;
  dateTo: string;
  mode: PeriodMode;
  label: string;
}

export function getMonthDateRange(year: number, month: number): DatePeriod {
  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const dateTo = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const monthName = new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long" });
  return {
    dateFrom,
    dateTo,
    mode: "month",
    label: `${monthName} ${year}`,
  };
}

export function getYearDateRange(year: number): DatePeriod {
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year + 1}-01-01`,
    mode: "year",
    label: `Year ${year}`,
  };
}

export function getCustomDateRange(dateFrom: string, dateTo: string): DatePeriod {
  return {
    dateFrom,
    dateTo,
    mode: "range",
    label: `${dateFrom} to ${dateTo}`,
  };
}

export function isDateInPeriod(date: string, period: Pick<DatePeriod, "dateFrom" | "dateTo">): boolean {
  return date >= period.dateFrom && date < period.dateTo;
}

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function getYearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => current - 2 + i);
}
