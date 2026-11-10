import { roundMoney } from "@/lib/dashboard/format";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";
import type { PadColumnKind } from "@/lib/reports/pad-workbook";

export type DsrLedgerColumnFormat = "litres" | "number" | "money" | "rate";

export type DsrLedgerMeasureKey = Exclude<
  keyof DsrLedgerRow,
  "id" | "date" | "dateDisplay" | "product"
>;

export interface DsrLedgerColumn {
  key: DsrLedgerMeasureKey;
  label: string;
  format: DsrLedgerColumnFormat;
  excelKind: PadColumnKind;
}

export const DSR_LEDGER_MEASURE_COLUMNS: DsrLedgerColumn[] = [
  { key: "productDip", label: "Product dip", format: "number", excelKind: "qty3" },
  { key: "productVolume", label: "Product volume", format: "litres", excelKind: "qty3" },
  { key: "totalOpeningStock", label: "Opening stock", format: "litres", excelKind: "qty3" },
  { key: "receiptAsAutomation", label: "Receipt", format: "litres", excelKind: "qty3" },
  { key: "totalStock", label: "Total stock", format: "litres", excelKind: "qty3" },
  { key: "nozzleN1", label: "Nozzle N1", format: "number", excelKind: "qty3" },
  { key: "nozzleN2", label: "Nozzle N2", format: "number", excelKind: "qty3" },
  { key: "testingLitres", label: "Testing", format: "litres", excelKind: "qty3" },
  { key: "netTankSales", label: "Net tank sales", format: "litres", excelKind: "qty3" },
  { key: "netTotalizerSales", label: "Net totalizer sales", format: "litres", excelKind: "qty3" },
  { key: "netCumulativeTotalizerSales", label: "Cum. totalizer", format: "litres", excelKind: "qty3" },
  { key: "netTransactionSales", label: "Net transaction sales", format: "litres", excelKind: "qty3" },
  { key: "netCumulativeTransactionSales", label: "Cum. transaction", format: "litres", excelKind: "qty3" },
  { key: "lossGainDayTotalizer", label: "L/G day (totalizer)", format: "litres", excelKind: "qty3" },
  { key: "cummLossGainMonthTotalizer", label: "Cum. L/G (totalizer)", format: "litres", excelKind: "qty3" },
  { key: "lossGainDayTransaction", label: "L/G day (transaction)", format: "litres", excelKind: "qty3" },
  { key: "cummLossGainMonthTransaction", label: "Cum. L/G (transaction)", format: "litres", excelKind: "qty3" },
  { key: "rspPerLitre", label: "RSP", format: "rate", excelKind: "rate" },
  { key: "grossProfit", label: "Gross profit", format: "money", excelKind: "money" },
];

export const DSR_LEDGER_DEFAULT_VISIBLE_KEYS: DsrLedgerMeasureKey[] = [
  "receiptAsAutomation",
  "netTotalizerSales",
  "rspPerLitre",
  "grossProfit",
];

export const DSR_LEDGER_TOTAL_KEYS = [
  "receiptAsAutomation",
  "netTotalizerSales",
  "grossProfit",
] as const;

export type DsrLedgerTotalKey = (typeof DSR_LEDGER_TOTAL_KEYS)[number];

const MEASURE_KEY_SET = new Set(DSR_LEDGER_MEASURE_COLUMNS.map((column) => column.key));

function isMeasureKey(value: string): value is DsrLedgerMeasureKey {
  return MEASURE_KEY_SET.has(value as DsrLedgerMeasureKey);
}

export function parseDsrLedgerVisibleKeys(raw: unknown): DsrLedgerMeasureKey[] | null {
  if (!Array.isArray(raw)) return null;
  const keys = raw.filter((value): value is DsrLedgerMeasureKey => {
    return typeof value === "string" && isMeasureKey(value);
  });
  const unique: DsrLedgerMeasureKey[] = [];
  const seen = new Set<DsrLedgerMeasureKey>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(key);
  }
  return unique.length ? unique : null;
}

/** Date and product first, then selected measures in ledger order. RSP is always included. */
export function resolveDsrLedgerExportColumns(selectedKeys: readonly string[]): DsrLedgerColumn[] {
  const selected = new Set(selectedKeys.filter(isMeasureKey));
  selected.add("rspPerLitre");
  return DSR_LEDGER_MEASURE_COLUMNS.filter((column) => selected.has(column.key));
}

export function filterDsrLedgerRows(
  rows: DsrLedgerRow[],
  options: { search?: string; product?: "" | IrasDsrProduct }
): DsrLedgerRow[] {
  const query = options.search?.trim().toLowerCase() ?? "";
  const product = options.product ?? "";
  return rows.filter((row) => {
    const textMatch =
      !query ||
      [row.dateDisplay, row.product, row.date].join(" ").toLowerCase().includes(query);
    const productMatch = !product || row.product === product;
    return textMatch && productMatch;
  });
}

function sumField(rows: DsrLedgerRow[], key: DsrLedgerTotalKey): number {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

export function computeDsrLedgerTotals(rows: DsrLedgerRow[]): Record<DsrLedgerTotalKey, number> {
  return {
    receiptAsAutomation: sumField(rows, "receiptAsAutomation"),
    netTotalizerSales: sumField(rows, "netTotalizerSales"),
    grossProfit: roundMoney(sumField(rows, "grossProfit")),
  };
}
