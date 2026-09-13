import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { StockProduct } from "@/lib/stock/types";

export interface DsrProductStockBoundary {
  opening: number | null;
  closing: number | null;
}

export type DsrStockBoundaries = Record<StockProduct, DsrProductStockBoundary>;

function emptyBoundaries(): DsrStockBoundaries {
  return {
    MS: { opening: null, closing: null },
    HSD: { opening: null, closing: null },
  };
}

export function nextIsoDate(iso: string): string {
  const cursor = new Date(`${iso}T00:00:00`);
  cursor.setDate(cursor.getDate() + 1);
  const year = cursor.getFullYear();
  const month = String(cursor.getMonth() + 1).padStart(2, "0");
  const day = String(cursor.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Include the day after period end when loading DSR rows for stock boundaries. */
export function dsrStockFetchDateTo(dateTo: string): string {
  return nextIsoDate(dateTo);
}

function findProductRow(rows: DsrLedgerRow[], product: StockProduct, isoDate: string) {
  return rows.find((row) => row.product === product && row.date === isoDate);
}

/**
 * Derive tank opening/closing litres from DSR rows for a period (MS/HSD separately).
 * Opening = first day total opening stock.
 * Closing = next day opening stock (month-end boundary), not last day total stock.
 */
export function deriveDsrStockBoundaries(
  rows: DsrLedgerRow[],
  dateFrom: string,
  dateTo: string
): DsrStockBoundaries {
  const result = emptyBoundaries();
  const nextDay = nextIsoDate(dateTo);

  for (const product of ["MS", "HSD"] as const) {
    const productRows = rows
      .filter((row) => row.product === product && row.date >= dateFrom && row.date <= dateTo)
      .sort((left, right) => left.date.localeCompare(right.date));

    if (productRows.length === 0) continue;

    const openingRow = productRows.find((row) => row.date === dateFrom) ?? productRows[0];
    result[product].opening = openingRow.totalOpeningStock ?? openingRow.totalStock;

    const nextDayRow = findProductRow(rows, product, nextDay);
    if (nextDayRow) {
      result[product].closing = nextDayRow.totalOpeningStock ?? nextDayRow.totalStock;
      continue;
    }

    const lastDayRow =
      productRows.find((row) => row.date === dateTo) ?? productRows[productRows.length - 1];
    result[product].closing = lastDayRow.totalStock ?? lastDayRow.totalOpeningStock;
  }

  return result;
}

export function hasAnyDsrStockBoundary(boundaries: DsrStockBoundaries): boolean {
  return (["MS", "HSD"] as const).some(
    (product) => boundaries[product].opening != null || boundaries[product].closing != null
  );
}

export function hasFullDsrStockBoundary(boundaries: DsrStockBoundaries): boolean {
  return (["MS", "HSD"] as const).every(
    (product) => boundaries[product].opening != null && boundaries[product].closing != null
  );
}
