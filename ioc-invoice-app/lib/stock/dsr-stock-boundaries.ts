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

/** Derive tank opening/closing litres from DSR rows for a period (MS/HSD separately). */
export function deriveDsrStockBoundaries(
  rows: DsrLedgerRow[],
  dateFrom: string,
  dateTo: string
): DsrStockBoundaries {
  const result = emptyBoundaries();

  for (const product of ["MS", "HSD"] as const) {
    const productRows = rows
      .filter((row) => row.product === product && row.date >= dateFrom && row.date <= dateTo)
      .sort((left, right) => left.date.localeCompare(right.date));

    if (productRows.length === 0) continue;

    const openingRow = productRows.find((row) => row.date === dateFrom) ?? productRows[0];
    const closingRow =
      productRows.find((row) => row.date === dateTo) ?? productRows[productRows.length - 1];

    result[product].opening = openingRow.totalOpeningStock ?? openingRow.totalStock;
    result[product].closing = closingRow.totalStock ?? closingRow.totalOpeningStock;
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
