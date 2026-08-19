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

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  return formatIsoDate(date);
}

/** User-selected inclusive end date → exclusive period end for queries/storage. */
export function getInclusiveDateRangePeriod(
  dateFrom: string,
  dateToInclusive: string
): DatePeriod {
  return {
    dateFrom,
    dateTo: addDays(dateToInclusive, 1),
    mode: "range",
    label: `${dateFrom} to ${dateToInclusive}`,
  };
}

export interface InclusiveDateRangeChunk {
  dateFrom: string;
  dateToInclusive: string;
  label: string;
}

/** Split an inclusive date range into month-sized chunks for Gmail fetch progress. */
export function getMonthChunksInDateRange(
  dateFrom: string,
  dateToInclusive: string
): InclusiveDateRangeChunk[] {
  if (dateFrom > dateToInclusive) return [];

  const chunks: InclusiveDateRangeChunk[] = [];
  let cursorFrom = dateFrom;

  while (cursorFrom <= dateToInclusive) {
    const [year, month] = cursorFrom.split("-").map(Number);
    const monthEnd = formatIsoDate(new Date(year, month, 0));
    const chunkEnd = monthEnd < dateToInclusive ? monthEnd : dateToInclusive;

    chunks.push({
      dateFrom: cursorFrom,
      dateToInclusive: chunkEnd,
      label:
        cursorFrom === chunkEnd
          ? cursorFrom
          : `${cursorFrom} to ${chunkEnd}`,
    });

    if (chunkEnd >= dateToInclusive) break;
    cursorFrom = addDays(chunkEnd, 1);
  }

  return chunks;
}

export function getLastNDaysRange(
  days: number,
  fromDate = new Date()
): { dateFrom: string; dateToInclusive: string } {
  const end = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    dateFrom: formatIsoDate(start),
    dateToInclusive: formatIsoDate(end),
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

export const EARLIEST_DATA_YEAR = 2020;

export function getYearOptions(now = new Date()): number[] {
  const current = now.getFullYear();
  const years: number[] = [];
  for (let year = EARLIEST_DATA_YEAR; year <= current; year++) {
    years.push(year);
  }
  return years;
}

/** Returns the last N calendar months ending with the month of `fromDate`, oldest first. */
export function getLastNCalendarMonths(
  count: number,
  fromDate = new Date()
): Array<{ year: number; month: number; label: string }> {
  const months: Array<{ year: number; month: number; label: string }> = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(fromDate.getFullYear(), fromDate.getMonth() - offset, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    months.push({
      year,
      month,
      label: date.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    });
  }

  return months;
}
