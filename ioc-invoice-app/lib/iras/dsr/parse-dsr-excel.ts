import { Workbook, type CellValue, type Worksheet } from "exceljs";
import type { IrasDsrProduct, IrasDsrRecord } from "@/lib/iras/dsr/types";

export interface ParseDsrExcelResult {
  product: IrasDsrProduct;
  records: IrasDsrRecord[];
  columns: string[];
  month: number;
  year: number;
  tankLabel: string | null;
  sourceFilename: string;
  warnings: string[];
}

function unwrapCell(value: CellValue): unknown {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj.result !== undefined) return unwrapCell(obj.result as CellValue);
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map((part) => part.text ?? "").join("");
    }
  }
  return value;
}

function cellText(value: CellValue): string {
  const unwrapped = unwrapCell(value);
  if (unwrapped instanceof Date) return unwrapped.toISOString();
  return String(unwrapped ?? "").trim();
}

function normHeader(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function formatDsrDateValue(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const text = String(value ?? "").trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}-${month}-${year}`;
  }

  return null;
}

function formatDsrNumberValue(value: unknown): string | number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).replace(/,/g, "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : text;
}

type ColumnKey =
  | "date"
  | "productDip"
  | "waterDip"
  | "productVolume"
  | "waterVolume"
  | "netVolume"
  | "totalOpeningStock"
  | "receipt"
  | "totalStock"
  | "nozzle1"
  | "nozzle2"
  | "testing"
  | "twoTSales"
  | "netTankSales"
  | "netTotalizer"
  | "cumTotalizer"
  | "netTransaction"
  | "cumTransaction"
  | "lossGainDayTotalizer"
  | "cumLossGainTotalizer"
  | "lossGainDayTransaction"
  | "cumLossGainTransaction";

function resolveColumnKey(header: string): ColumnKey | null {
  const h = normHeader(header);
  if (!h) return null;
  if (h === "date") return "date";
  if (h === "product dip") return "productDip";
  if (h === "water dip") return "waterDip";
  if (h === "product volume") return "productVolume";
  if (h === "water volume") return "waterVolume";
  if (h === "net volume of product") return "netVolume";
  if (h === "total opening stock") return "totalOpeningStock";
  if (h === "receipt as per automation") return "receipt";
  if (h === "total stock") return "totalStock";
  if (h === "testing") return "testing";
  if (h === "2t sales") return "twoTSales";
  if (h === "net tank sales") return "netTankSales";
  if (h.includes("net totaliser sales") && h.includes("for the day")) return "netTotalizer";
  if (h.includes("cumulative totaliser sales")) return "cumTotalizer";
  if (h.includes("net transaction sales") && h.includes("for the day")) return "netTransaction";
  if (h.includes("cumulative transaction sales")) return "cumTransaction";
  if (h.includes("loss/gain") && h.includes("totaliser") && h.includes("for the day")) {
    return "lossGainDayTotalizer";
  }
  if (h.includes("cumm loss/gain") && h.includes("totaliser")) return "cumLossGainTotalizer";
  if (h.includes("loss/gain") && h.includes("transaction") && h.includes("for the day")) {
    return "lossGainDayTransaction";
  }
  if (h.includes("cumm loss/gain") && h.includes("transaction")) return "cumLossGainTransaction";
  return null;
}

function findHeaderRow(ws: Worksheet): number {
  for (let rowNumber = 1; rowNumber <= Math.min(12, ws.rowCount); rowNumber++) {
    const row = ws.getRow(rowNumber);
    let hasDate = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (resolveColumnKey(cellText(cell.value)) === "date") hasDate = true;
    });
    if (hasDate) return rowNumber;
  }
  throw new Error("Could not find DSR header row (Date column missing)");
}

function detectTankLabel(ws: Worksheet, headerRow: number): string | null {
  for (let rowNumber = Math.max(1, headerRow - 2); rowNumber < headerRow; rowNumber++) {
    const row = ws.getRow(rowNumber);
    for (let col = 1; col <= 8; col++) {
      const text = cellText(row.getCell(col).value);
      const match = text.match(/tank-(\d)/i);
      if (match) return `Tank-${match[1]}`;
    }
  }
  return null;
}

function buildColumnMap(ws: Worksheet, headerRow: number): Map<ColumnKey, number> {
  const row = ws.getRow(headerRow);
  const headers: Array<{ col: number; key: ColumnKey | null; header: string }> = [];

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = cellText(cell.value);
    headers.push({ col: colNumber, key: resolveColumnKey(header), header });
  });

  const map = new Map<ColumnKey, number>();
  for (const entry of headers) {
    if (entry.key && !map.has(entry.key)) {
      map.set(entry.key, entry.col);
    }
  }

  const totalStockCol = map.get("totalStock");
  const testingCol = map.get("testing");
  if (totalStockCol != null && testingCol != null && testingCol > totalStockCol + 1) {
    const nozzleCols = headers
      .filter((entry) => entry.col > totalStockCol && entry.col < testingCol)
      .map((entry) => entry.col);
    if (nozzleCols[0] != null) map.set("nozzle1", nozzleCols[0]);
    if (nozzleCols[1] != null) map.set("nozzle2", nozzleCols[1]);
  }

  if (!map.has("date")) {
    throw new Error("DSR Excel is missing the Date column");
  }

  return map;
}

function tankIndex(product: IrasDsrProduct): "1" | "2" {
  return product === "MS" ? "1" : "2";
}

function nozzleKeys(product: IrasDsrProduct): [string, string] {
  return product === "MS"
    ? ["nozzle_tank_t2_1", "nozzle_tank_t2_2"]
    : ["nozzle_tank_t2_3", "nozzle_tank_t2_4"];
}

function recordFieldNames(product: IrasDsrProduct): string[] {
  const idx = tankIndex(product);
  const [n1, n2] = nozzleKeys(product);
  return [
    "date_time",
    `product_dip_${idx}`,
    `water_dip_${idx}`,
    `product_qty_${idx}`,
    `water_qty_${idx}`,
    `net_volume_${idx}`,
    "totalOpeningStock",
    "receiptAsAutomation",
    "totalStock",
    n1,
    n2,
    "testing",
    "sales2t",
    "netTankSales",
    "netTotalizerSales",
    "netCumulativeTotaliserSales",
    "netTransactionSales",
    "netCumulativeTransactionSales",
    "lossGainForDayAsPerTotaliserSales",
    "cummLossGainForMonthAsPerTotaliserSales",
    "lossGainForDayAsPerTransactionSales",
    "cummLossGainForMonthAsPerTransactionSales",
  ];
}

function buildRecordFromRow(
  ws: Worksheet,
  rowNumber: number,
  columnMap: Map<ColumnKey, number>,
  product: IrasDsrProduct
): IrasDsrRecord | null {
  const row = ws.getRow(rowNumber);
  const dateCol = columnMap.get("date");
  if (dateCol == null) return null;

  const dateTime = formatDsrDateValue(row.getCell(dateCol).value);
  if (!dateTime) return null;

  const idx = tankIndex(product);
  const [nozzleN1Key, nozzleN2Key] = nozzleKeys(product);

  const getValue = (key: ColumnKey) => {
    const col = columnMap.get(key);
    if (col == null) return null;
    return formatDsrNumberValue(row.getCell(col).value);
  };

  const record: IrasDsrRecord = {
    date_time: dateTime,
    [`product_dip_${idx}`]: getValue("productDip"),
    [`water_dip_${idx}`]: getValue("waterDip"),
    [`product_qty_${idx}`]: getValue("productVolume"),
    [`water_qty_${idx}`]: getValue("waterVolume"),
    [`net_volume_${idx}`]: getValue("netVolume"),
    totalOpeningStock: getValue("totalOpeningStock"),
    receiptAsAutomation: getValue("receipt"),
    totalStock: getValue("totalStock"),
    [nozzleN1Key]: getValue("nozzle1"),
    [nozzleN2Key]: getValue("nozzle2"),
    testing: getValue("testing"),
    sales2t: getValue("twoTSales"),
    netTankSales: getValue("netTankSales"),
    netTotalizerSales: getValue("netTotalizer"),
    netCumulativeTotaliserSales: getValue("cumTotalizer"),
    netTransactionSales: getValue("netTransaction"),
    netCumulativeTransactionSales: getValue("cumTransaction"),
    lossGainForDayAsPerTotaliserSales: getValue("lossGainDayTotalizer"),
    cummLossGainForMonthAsPerTotaliserSales: getValue("cumLossGainTotalizer"),
    lossGainForDayAsPerTransactionSales: getValue("lossGainDayTransaction"),
    cummLossGainForMonthAsPerTransactionSales: getValue("cumLossGainTransaction"),
  };

  return record;
}

function inferReportMonthYear(records: IrasDsrRecord[]): { month: number; year: number } {
  const counts = new Map<string, number>();
  for (const record of records) {
    const dateTime = typeof record.date_time === "string" ? record.date_time : "";
    const match = dateTime.match(/^\d{2}-(\d{2})-(\d{4})$/);
    if (!match) continue;
    const key = `${match[1]}-${match[2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const [topKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!topKey) {
    throw new Error("Could not infer report month from DSR dates");
  }

  const [month, year] = topKey.split("-").map(Number);
  return { month, year };
}

function expectedTankLabel(product: IrasDsrProduct): string {
  return product === "MS" ? "Tank-1" : "Tank-2";
}

export async function parseDsrExcelBuffer(
  buffer: Buffer | ArrayBuffer,
  product: IrasDsrProduct,
  sourceFilename = "upload.xlsx"
): Promise<ParseDsrExcelResult> {
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Workbook has no worksheets");
  }

  const headerRow = findHeaderRow(worksheet);
  const columnMap = buildColumnMap(worksheet, headerRow);
  const tankLabel = detectTankLabel(worksheet, headerRow);
  const warnings: string[] = [];

  if (tankLabel && tankLabel !== expectedTankLabel(product)) {
    warnings.push(
      `File shows ${tankLabel} but you selected ${product} (${expectedTankLabel(product)}). Imported as ${product}.`
    );
  }

  const records: IrasDsrRecord[] = [];
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const record = buildRecordFromRow(worksheet, rowNumber, columnMap, product);
    if (record) records.push(record);
  }

  if (records.length === 0) {
    throw new Error("No daily DSR rows found in the Excel file");
  }

  const { month, year } = inferReportMonthYear(records);
  const outOfMonth = records.filter((record) => {
    const dateTime = typeof record.date_time === "string" ? record.date_time : "";
    const match = dateTime.match(/^\d{2}-(\d{2})-(\d{4})$/);
    if (!match) return false;
    return Number(match[1]) !== month || Number(match[2]) !== year;
  });

  if (outOfMonth.length > 0) {
    warnings.push(
      `${outOfMonth.length} row${outOfMonth.length === 1 ? "" : "s"} fall outside ${String(month).padStart(2, "0")}/${year} and will still be stored.`
    );
  }

  return {
    product,
    records,
    columns: recordFieldNames(product),
    month,
    year,
    tankLabel,
    sourceFilename,
    warnings,
  };
}
