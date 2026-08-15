import { formatDate } from "@/lib/utils";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Parse user date input (DD/MM/YYYY, DD-MM-YY, YYYY-MM-DD, etc.) to ISO date. */
export function parseSearchDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return toIsoDate(
      Number(trimmed.slice(0, 4)),
      Number(trimmed.slice(5, 7)),
      Number(trimmed.slice(8, 10))
    );
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    return toIsoDate(year, month, day);
  }

  const textMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})$/);
  if (textMatch) {
    const day = Number(textMatch[1]);
    const month = new Date(`${textMatch[2]} 1, 2000`).getMonth() + 1;
    let year = Number(textMatch[3]);
    if (year < 100) year += 2000;
    if (Number.isNaN(month) || month < 1) return null;
    return toIsoDate(year, month, day);
  }

  return null;
}

/** Parse MM/YYYY style input for month-level filtering. */
export function parseMonthSearch(input: string): { dateFrom: string; dateTo: string } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})[/.-](\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) return null;

  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${year}-${pad2(month)}-01`,
    dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export function getDateSearchVariants(isoDate: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return [];

  const [year, month, day] = isoDate.split("-").map(Number);
  const shortYear = String(year).slice(-2);

  return [
    isoDate,
    `${pad2(day)}/${pad2(month)}/${year}`,
    `${pad2(day)}-${pad2(month)}-${year}`,
    `${pad2(day)}.${pad2(month)}.${year}`,
    `${pad2(day)}/${pad2(month)}/${shortYear}`,
    formatDate(isoDate),
    new Date(year, month - 1, day).toLocaleDateString("en-IN"),
  ];
}

export function matchesDateSearch(query: string, isoDate: string | null | undefined): boolean {
  if (!query.trim() || !isoDate) return false;

  const parsedDate = parseSearchDate(query);
  if (parsedDate) return parsedDate === isoDate;

  const monthRange = parseMonthSearch(query);
  if (monthRange) {
    return isoDate >= monthRange.dateFrom && isoDate <= monthRange.dateTo;
  }

  const q = query.trim().toLowerCase();
  return getDateSearchVariants(isoDate).some((variant) => variant.toLowerCase().includes(q));
}
