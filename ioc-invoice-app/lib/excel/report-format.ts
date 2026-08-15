const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseIsoMonth(isoDate: string) {
  const [year, month] = isoDate.split("-").map(Number);
  return { year, month };
}

export function formatExcelDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shortMonth = MONTH_NAMES_SHORT[month - 1];
  return `${String(day).padStart(2, "0")}-${shortMonth}-${String(year).slice(-2)}`;
}

export function buildReportFilename(dateFrom?: string): string {
  const iso = dateFrom || new Date().toISOString().slice(0, 10);
  const { year, month } = parseIsoMonth(iso);
  const monthName = MONTH_NAMES_FULL[month - 1];
  return `IOC_Invoices_${monthName}_${year}.xlsx`;
}

export function buildSheetName(dateFrom?: string): string {
  const iso = dateFrom || new Date().toISOString().slice(0, 10);
  const { year, month } = parseIsoMonth(iso);
  const shortMonth = MONTH_NAMES_SHORT[month - 1];
  return `${shortMonth} ${year} Invoices`;
}

export function buildReportTitle(dateFrom?: string): string {
  const iso = dateFrom || new Date().toISOString().slice(0, 10);
  const { year, month } = parseIsoMonth(iso);
  const monthName = MONTH_NAMES_FULL[month - 1];
  return `Indian Oil Corporation — Invoice Report  |  ${monthName} ${year}`;
}

export const REPORT_COLUMNS = [
  "Date",
  "Name of the Supplier",
  "Bill No",
  "Product",
  "Invoice Value (₹)",
  "HSN Code",
  "Quantity",
  "Measure",
] as const;
