import { roundMoney } from "@/lib/dashboard/format";
import type { IrasDsrProduct, IrasDsrRecord } from "@/lib/iras/dsr/types";

export interface DsrLedgerRow {
  id: string;
  date: string;
  dateDisplay: string;
  product: IrasDsrProduct;
  productDip: number | null;
  productVolume: number | null;
  totalOpeningStock: number | null;
  receiptAsAutomation: number | null;
  totalStock: number | null;
  nozzleN1: number | null;
  nozzleN2: number | null;
  testingLitres: number | null;
  netTankSales: number | null;
  netTotalizerSales: number | null;
  netCumulativeTotalizerSales: number | null;
  netTransactionSales: number | null;
  netCumulativeTransactionSales: number | null;
  lossGainDayTotalizer: number | null;
  cummLossGainMonthTotalizer: number | null;
  lossGainDayTransaction: number | null;
  cummLossGainMonthTransaction: number | null;
  grossProfit: number | null;
}

const TESTING_KEYS = ["testing", "testingLitres", "testing_litres"] as const;
const OPENING_STOCK_KEYS = ["totalOpeningStock", "totalopeningstock"] as const;
const RECEIPT_KEYS = ["receiptAsAutomation", "receiptasautomation"] as const;
const STOCK_KEYS = ["totalStock", "totalstock", "total_stock"] as const;
const TANK_SALES_KEYS = ["netTankSales", "nettanksales", "net_tank_sales"] as const;
const TOTALIZER_SALES_KEYS = ["netTotalizerSales", "nettotalizersales", "net_totalizer_sales"] as const;
const CUM_TOTALIZER_KEYS = [
  "netCumulativeTotaliserSales",
  "netCumulativeTotalizerSales",
  "netcumulativetotalisersales",
] as const;
const TRANSACTION_SALES_KEYS = [
  "netTransactionSales",
  "nettransactionsales",
  "net_transaction_sales",
] as const;
const CUM_TRANSACTION_KEYS = [
  "netCumulativeTransactionSales",
  "netcumulativetransactionsales",
] as const;
const LOSS_GAIN_DAY_TOTALIZER_KEYS = [
  "lossGainForDayAsPerTotaliserSales",
  "lossGainForDayAsPerTotalizerSales",
] as const;
const CUM_LOSS_GAIN_TOTALIZER_KEYS = [
  "cummLossGainForMonthAsPerTotaliserSales",
  "cummLossGainForMonthAsPerTotalizerSales",
] as const;
const LOSS_GAIN_DAY_TRANSACTION_KEYS = ["lossGainForDayAsPerTransactionSales"] as const;
const CUM_LOSS_GAIN_TRANSACTION_KEYS = ["cummLossGainForMonthAsPerTransactionSales"] as const;

function tankIndex(product: IrasDsrProduct): "1" | "2" {
  return product === "MS" ? "1" : "2";
}

function nozzleKeys(product: IrasDsrProduct): [string, string] {
  return product === "MS"
    ? ["nozzle_tank_t2_1", "nozzle_tank_t2_2"]
    : ["nozzle_tank_t2_3", "nozzle_tank_t2_4"];
}

export function dsrDateToIso(value: string): string | null {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function isoDateToDsrDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}

export function parseDsrNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstNumericField(record: IrasDsrRecord, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = parseDsrNumber(record[key]);
    if (value != null) return value;
  }
  return null;
}

export function resolveDsrDate(record: IrasDsrRecord, fallback?: string): string | null {
  const raw =
    typeof record.date_time === "string" && record.date_time.trim()
      ? record.date_time
      : fallback;
  if (!raw) return null;
  return dsrDateToIso(raw);
}

export function normalizeDsrRecord(
  record: IrasDsrRecord,
  product: IrasDsrProduct,
  dsrDate?: string,
  grossProfit?: number | null
): DsrLedgerRow | null {
  const isoDate = resolveDsrDate(record, dsrDate);
  if (!isoDate) return null;

  const idx = tankIndex(product);
  const [nozzleN1Key, nozzleN2Key] = nozzleKeys(product);

  return {
    id: `${isoDate}::${product}`,
    date: isoDate,
    dateDisplay: isoDateToDsrDisplay(isoDate),
    product,
    productDip: parseDsrNumber(record[`product_dip_${idx}`]),
    productVolume: parseDsrNumber(record[`product_qty_${idx}`]),
    totalOpeningStock: firstNumericField(record, OPENING_STOCK_KEYS),
    receiptAsAutomation: firstNumericField(record, RECEIPT_KEYS),
    totalStock: firstNumericField(record, STOCK_KEYS),
    nozzleN1: parseDsrNumber(record[nozzleN1Key]),
    nozzleN2: parseDsrNumber(record[nozzleN2Key]),
    testingLitres: firstNumericField(record, TESTING_KEYS),
    netTankSales: firstNumericField(record, TANK_SALES_KEYS),
    netTotalizerSales: firstNumericField(record, TOTALIZER_SALES_KEYS),
    netCumulativeTotalizerSales: firstNumericField(record, CUM_TOTALIZER_KEYS),
    netTransactionSales: firstNumericField(record, TRANSACTION_SALES_KEYS),
    netCumulativeTransactionSales: firstNumericField(record, CUM_TRANSACTION_KEYS),
    lossGainDayTotalizer: firstNumericField(record, LOSS_GAIN_DAY_TOTALIZER_KEYS),
    cummLossGainMonthTotalizer: firstNumericField(record, CUM_LOSS_GAIN_TOTALIZER_KEYS),
    lossGainDayTransaction: firstNumericField(record, LOSS_GAIN_DAY_TRANSACTION_KEYS),
    cummLossGainMonthTransaction: firstNumericField(record, CUM_LOSS_GAIN_TRANSACTION_KEYS),
    grossProfit: grossProfit != null ? roundMoney(grossProfit) : null,
  };
}

export function countCalendarDays(dateFrom: string, dateTo: string): number {
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

export function listIsoDatesInRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
