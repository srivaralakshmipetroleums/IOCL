import { categorizePadTransaction, type PadTransactionCategory } from "@/lib/pad/categorize";

export interface ParsedPadTransaction {
  lineNumber: number;
  plant: string | null;
  itemText: string;
  documentType: string | null;
  documentNumber: string | null;
  transactionDate: string | null;
  materialGroup: string | null;
  quantity: number | null;
  unit: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  category: PadTransactionCategory;
}

export interface ParsedPadStatement {
  fyLabel: string;
  periodFrom: string;
  periodTo: string;
  customerName: string | null;
  customerCode: string | null;
  controllingOffice: string | null;
  reportGeneratedAt: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  openDeliveryValue: number | null;
  transactions: ParsedPadTransaction[];
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, "")).trim();
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned || cleaned === "—" || cleaned === "-") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalAmount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parse DD.MM.YY or DD-MMM-YYYY style dates from PAD exports. */
export function parsePadDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    let year = Number(dotted[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    return formatIsoDate(year, month, day);
  }

  const dashed = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (dashed) {
    const months: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const month = months[dashed[2].toLowerCase().slice(0, 3)];
    if (!month) return null;
    let year = Number(dashed[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    return formatIsoDate(year, month, Number(dashed[1]));
  }

  return null;
}

function formatIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parsePeriodRange(text: string): { from: string | null; to: string | null } {
  const match = text.match(/From\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\s+To\s+(\d{1,2}-[A-Za-z]{3}-\d{4})/i);
  if (!match) return { from: null, to: null };
  return { from: parsePadDate(match[1]), to: parsePadDate(match[2]) };
}

function parseCustomer(text: string): { name: string | null; code: string | null } {
  const match = text.match(/Customer:-\s*(.+?)\s*\((\d+)\)\s*$/i);
  if (!match) return { name: null, code: null };
  return { name: match[1].trim(), code: match[2] };
}

function parseReportGeneratedAt(text: string): string | null {
  const match = text.match(/Report Generated Date\/Time:-\s*(.+)$/i);
  if (!match) return null;
  const parsed = new Date(match[1].trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function fyLabelFromFilename(filename: string): string {
  const match = filename.match(/APR-(\d{2})\s+to\s+MAR-(\d{2})/i);
  if (!match) return filename;
  const startYear = 2000 + Number(match[1]);
  const endYear = 2000 + Number(match[2]);
  return `FY ${startYear}-${String(endYear).slice(-2)}`;
}

function extractTableRows(html: string): string[][] {
  const tableMatch = html.match(/<table class="table table-bordered"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tableMatch) return [];

  const rows: string[][] = [];
  const rowMatches = tableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi);
  for (const rowMatch of rowMatches) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
      stripTags(cell[1])
    );
    if (cells.length >= 11) rows.push(cells);
  }
  return rows;
}

export function parsePadStatementHtml(html: string, sourceFilename: string): ParsedPadStatement {
  const customerText = stripTags(html.match(/id="cust"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
  const controllingOffice = stripTags(
    html.match(/id="coff"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""
  ).replace(/^Controlling Office:-\s*/i, "");
  const periodText = stripTags(html.match(/id="period1"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
  const reportGeneratedText = stripTags(html.match(/id="date"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "");
  const openingText = stripTags(html.match(/id="opBal"[^>]*>([\s\S]*?)<\/label>/i)?.[1] ?? "");
  const closingText = stripTags(html.match(/id="clBal"[^>]*>([\s\S]*?)<\/label>/i)?.[1] ?? "");

  const { from, to } = parsePeriodRange(periodText);
  const customer = parseCustomer(customerText);
  const openingMatch = openingText.match(/Opening Balance:\s*Rs\.\s*([\d,.-]+)/i);
  const closingMatch = closingText.match(/Closing balance:\s*Rs\.\s*([\d,.-]+)/i);

  const transactions: ParsedPadTransaction[] = [];
  let openDeliveryValue: number | null = null;

  for (const [index, cells] of extractTableRows(html).entries()) {
    const [
      plant,
      itemText,
      documentType,
      documentNumber,
      dateText,
      materialGroup,
      quantityText,
      unit,
      debitText,
      creditText,
      balanceText,
    ] = cells;

    if (itemText.toUpperCase().includes("OPEN DELIVERY VALUE")) {
      openDeliveryValue = parseOptionalAmount(balanceText);
      continue;
    }

    if (!itemText && !documentType && !dateText) continue;

    const category = categorizePadTransaction(documentType, itemText, materialGroup);
    if (category === "SUMMARY") continue;

    transactions.push({
      lineNumber: index + 1,
      plant: plant || null,
      itemText,
      documentType: documentType || null,
      documentNumber: documentNumber?.trim() || null,
      transactionDate: parsePadDate(dateText),
      materialGroup: materialGroup || null,
      quantity: parseOptionalAmount(quantityText),
      unit: unit || null,
      debit: parseAmount(debitText),
      credit: parseAmount(creditText),
      balance: parseOptionalAmount(balanceText),
      category,
    });
  }

  return {
    fyLabel: fyLabelFromFilename(sourceFilename),
    periodFrom: from || "",
    periodTo: to || "",
    customerName: customer.name,
    customerCode: customer.code,
    controllingOffice: controllingOffice || null,
    reportGeneratedAt: parseReportGeneratedAt(reportGeneratedText),
    openingBalance: openingMatch ? parseOptionalAmount(openingMatch[1]) : null,
    closingBalance: closingMatch ? parseOptionalAmount(closingMatch[1]) : null,
    openDeliveryValue,
    transactions,
  };
}
