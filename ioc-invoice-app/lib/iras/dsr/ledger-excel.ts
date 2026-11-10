import { formatExcelDate } from "@/lib/excel/report-format";
import {
  computeDsrLedgerTotals,
  resolveDsrLedgerExportColumns,
  type DsrLedgerColumn,
  type DsrLedgerTotalKey,
} from "@/lib/iras/dsr/ledger-columns";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import {
  addPadDataRow,
  addPadSheet,
  addPadTotalRow,
  applyPadAutoFilter,
  createPadWorkbook,
  type PadColumnKind,
} from "@/lib/reports/pad-workbook";

const DSR_LEDGER_FOOTER =
  "&LSri Varalakshmi Petroleums - DSR Daily Ledger&RPage &P of &N";

const IDENTITY_HEADERS = ["Date", "Product"] as const;
const IDENTITY_KINDS: PadColumnKind[] = ["text", "center"];
const IDENTITY_WIDTHS = [14, 12];

function columnWidth(column: DsrLedgerColumn): number {
  if (column.format === "money") return 16;
  if (column.label.length > 18) return 20;
  return 16;
}

function cellValue(row: DsrLedgerRow, column: DsrLedgerColumn): string | number | null {
  const value = row[column.key];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function totalCell(
  totals: Record<DsrLedgerTotalKey, number>,
  column: DsrLedgerColumn
): string | number | null {
  if (column.key === "receiptAsAutomation") return totals.receiptAsAutomation;
  if (column.key === "netTotalizerSales") return totals.netTotalizerSales;
  if (column.key === "grossProfit") return totals.grossProfit;
  return null;
}

export function buildDsrLedgerExcelFilename(dateFrom: string, dateTo: string): string {
  return `DSR_Ledger_${dateFrom}_to_${dateTo}.xlsx`;
}

export async function generateDsrLedgerExcel(input: {
  rows: DsrLedgerRow[];
  columnKeys: string[];
  dateFrom: string;
  dateTo: string;
  label?: string;
}) {
  const measures = resolveDsrLedgerExportColumns(input.columnKeys);
  const headers = [...IDENTITY_HEADERS, ...measures.map((column) => column.label)];
  const kinds: PadColumnKind[] = [
    ...IDENTITY_KINDS,
    ...measures.map((column) => column.excelKind),
  ];
  const widths = [...IDENTITY_WIDTHS, ...measures.map(columnWidth)];
  const periodLabel = input.label?.trim() || `${input.dateFrom} to ${input.dateTo}`;
  const title = `DSR Daily Ledger · ${periodLabel}`;

  const workbook = createPadWorkbook();
  const { sheet, lastCol } = addPadSheet(workbook, "Daily ledger", title, headers, kinds, widths);
  sheet.headerFooter.oddFooter = DSR_LEDGER_FOOTER;

  input.rows.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [formatExcelDate(row.date) || row.dateDisplay, row.product, ...measures.map((column) => cellValue(row, column))],
      kinds,
      index
    );
  });

  const lastDataRow = 2 + input.rows.length;
  const totals = computeDsrLedgerTotals(input.rows);
  addPadTotalRow(
    sheet,
    ["Totals", "", ...measures.map((column) => totalCell(totals, column))],
    kinds
  );

  if (input.rows.length > 0) {
    applyPadAutoFilter(sheet, lastCol, lastDataRow);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: buildDsrLedgerExcelFilename(input.dateFrom, input.dateTo),
  };
}
