import type { FuelProduct } from "@/lib/dashboard/fuel-products";
import type {
  StockCoverage,
  StockPeriodSummary,
  StockProduct,
  StockProductMovement,
  StockSnapshotRow,
} from "@/lib/stock/types";

const PRODUCT_LABELS: Record<StockProduct, string> = {
  MS: "Petrol (MS)",
  HSD: "Diesel (HSD)",
};

const FUEL_TO_STOCK: Record<FuelProduct, StockProduct> = {
  EBMS: "MS",
  "HSD-BSVI": "HSD",
};

export function stockProductFromFuel(product: FuelProduct): StockProduct {
  return FUEL_TO_STOCK[product];
}

function monthKeyFromDate(date: string): string {
  return date.slice(0, 7);
}

function fyStartYearForDate(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return month >= 4 ? year : year - 1;
}

function isFyStartDate(date: string): boolean {
  return date.endsWith("-04-01");
}

function isFyEndDate(date: string): boolean {
  return date.endsWith("-03-31");
}

function findSnapshot(
  snapshots: StockSnapshotRow[],
  product: StockProduct,
  kind: "opening" | "closing",
  scope: "month" | "financial_year",
  periodKey: string
): StockSnapshotRow | undefined {
  return snapshots.find(
    (row) =>
      row.product === product &&
      row.snapshot_kind === kind &&
      row.scope === scope &&
      row.period_key === periodKey
  );
}

function resolveBoundaryLitres(
  snapshots: StockSnapshotRow[],
  product: StockProduct,
  kind: "opening" | "closing",
  date: string
): number | null {
  const monthKey = monthKeyFromDate(date);
  const monthRow = findSnapshot(snapshots, product, kind, "month", monthKey);
  if (monthRow) return monthRow.quantity_litres;

  const fyYear = String(fyStartYearForDate(date));
  if (kind === "opening" && isFyStartDate(date)) {
    const fyRow = findSnapshot(snapshots, product, "opening", "financial_year", fyYear);
    if (fyRow) return fyRow.quantity_litres;
  }
  if (kind === "closing" && isFyEndDate(date)) {
    const fyRow = findSnapshot(snapshots, product, "closing", "financial_year", fyYear);
    if (fyRow) return fyRow.quantity_litres;
  }

  return null;
}

function buildProductMovement(
  product: StockProduct,
  openingLitres: number | null,
  purchasesLitres: number,
  closingLitres: number | null
): StockProductMovement {
  const impliedSalesLitres =
    openingLitres != null && closingLitres != null
      ? openingLitres + purchasesLitres - closingLitres
      : null;

  return {
    product,
    label: PRODUCT_LABELS[product],
    openingLitres,
    purchasesLitres,
    closingLitres,
    impliedSalesLitres,
  };
}

export function resolveStockForPeriod(
  snapshots: StockSnapshotRow[],
  dateFrom: string,
  dateTo: string,
  purchasesByProduct: Record<StockProduct, number>
): StockPeriodSummary {
  const msOpening = resolveBoundaryLitres(snapshots, "MS", "opening", dateFrom);
  const msClosing = resolveBoundaryLitres(snapshots, "MS", "closing", dateTo);
  const hsdOpening = resolveBoundaryLitres(snapshots, "HSD", "opening", dateFrom);
  const hsdClosing = resolveBoundaryLitres(snapshots, "HSD", "closing", dateTo);

  const ms = buildProductMovement("MS", msOpening, purchasesByProduct.MS, msClosing);
  const hsd = buildProductMovement("HSD", hsdOpening, purchasesByProduct.HSD, hsdClosing);

  const hasOpening = ms.openingLitres != null && hsd.openingLitres != null;
  const hasClosing = ms.closingLitres != null && hsd.closingLitres != null;
  const hasPartialOpening = ms.openingLitres != null || hsd.openingLitres != null;
  const hasPartialClosing = ms.closingLitres != null || hsd.closingLitres != null;

  let coverage: StockCoverage = "none";
  let coverageNote: string | null = null;

  if (hasOpening && hasClosing) {
    const fyStartYear = fyStartYearForDate(dateFrom);
    const isFullFy = dateFrom === `${fyStartYear}-04-01` && dateTo === `${fyStartYear + 1}-03-31`;
    coverage = isFullFy ? "full" : "fy_boundaries";
    if (!isFullFy) {
      coverageNote =
        "Stock uses FY opening/closing at period boundaries. Add monthly stock for month-wise movement.";
    }
  } else if (hasPartialOpening || hasPartialClosing) {
    coverage = "partial";
    coverageNote = "Stock data is incomplete for this period.";
  } else {
    coverageNote = "No stock snapshots for this period. Purchases from invoices are still shown.";
  }

  const totalOpeningLitres =
    ms.openingLitres != null && hsd.openingLitres != null
      ? ms.openingLitres + hsd.openingLitres
      : null;
  const totalClosingLitres =
    ms.closingLitres != null && hsd.closingLitres != null
      ? ms.closingLitres + hsd.closingLitres
      : null;
  const totalPurchasesLitres = ms.purchasesLitres + hsd.purchasesLitres;
  const totalImpliedSalesLitres =
    totalOpeningLitres != null && totalClosingLitres != null
      ? totalOpeningLitres + totalPurchasesLitres - totalClosingLitres
      : null;

  return {
    coverage,
    coverageNote,
    ms,
    hsd,
    totalOpeningLitres,
    totalPurchasesLitres,
    totalClosingLitres,
    totalImpliedSalesLitres,
  };
}
