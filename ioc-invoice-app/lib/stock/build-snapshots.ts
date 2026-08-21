import { getMonthRange } from "@/lib/dashboard/filters";
import type { UpsertStockSnapshotInput } from "@/lib/stock/repository";
import type { StockProduct, StockScope, StockSnapshotKind } from "@/lib/stock/types";

export interface StockBoundaryQuantities {
  msOpening?: number | null;
  msClosing?: number | null;
  hsdOpening?: number | null;
  hsdClosing?: number | null;
}

export function periodKeyForMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function periodKeyForFinancialYear(fyStartYear: number): string {
  return String(fyStartYear);
}

export function boundaryDatesForScope(
  scope: StockScope,
  periodKey: string
): { openingDate: string; closingDate: string } {
  if (scope === "month") {
    const [year, month] = periodKey.split("-").map(Number);
    const range = getMonthRange(year, month);
    return { openingDate: range.dateFrom, closingDate: range.dateTo };
  }

  const fyStartYear = Number(periodKey);
  return {
    openingDate: `${fyStartYear}-04-01`,
    closingDate: `${fyStartYear + 1}-03-31`,
  };
}

function pushIfPresent(
  rows: UpsertStockSnapshotInput[],
  scope: StockScope,
  periodKey: string,
  product: StockProduct,
  snapshotKind: StockSnapshotKind,
  quantity: number | null | undefined,
  effectiveDate: string
) {
  if (quantity == null || Number.isNaN(quantity) || quantity < 0) return;
  rows.push({
    scope,
    period_key: periodKey,
    product,
    snapshot_kind: snapshotKind,
    quantity_litres: quantity,
    effective_date: effectiveDate,
  });
}

export function buildBoundaryStockSnapshots(
  scope: StockScope,
  periodKey: string,
  quantities: StockBoundaryQuantities
): UpsertStockSnapshotInput[] {
  const { openingDate, closingDate } = boundaryDatesForScope(scope, periodKey);
  const rows: UpsertStockSnapshotInput[] = [];

  pushIfPresent(rows, scope, periodKey, "MS", "opening", quantities.msOpening, openingDate);
  pushIfPresent(rows, scope, periodKey, "MS", "closing", quantities.msClosing, closingDate);
  pushIfPresent(rows, scope, periodKey, "HSD", "opening", quantities.hsdOpening, openingDate);
  pushIfPresent(rows, scope, periodKey, "HSD", "closing", quantities.hsdClosing, closingDate);

  return rows;
}

export function parseLitresInput(value: string): number | null {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
