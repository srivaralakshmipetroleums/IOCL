import type { FuelProduct } from "@/lib/dashboard/fuel-products";
import type { DsrStockBoundaries } from "@/lib/stock/dsr-stock-boundaries";
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
  date: string,
  dsrBoundaries?: DsrStockBoundaries | null
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

  if (dsrBoundaries) {
    return kind === "opening"
      ? dsrBoundaries[product].opening
      : dsrBoundaries[product].closing;
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

function usedManualSnapshot(
  snapshots: StockSnapshotRow[],
  product: StockProduct,
  kind: "opening" | "closing",
  date: string
): boolean {
  const monthKey = monthKeyFromDate(date);
  if (findSnapshot(snapshots, product, kind, "month", monthKey)) return true;

  const fyYear = String(fyStartYearForDate(date));
  if (kind === "opening" && isFyStartDate(date)) {
    return Boolean(findSnapshot(snapshots, product, "opening", "financial_year", fyYear));
  }
  if (kind === "closing" && isFyEndDate(date)) {
    return Boolean(findSnapshot(snapshots, product, "closing", "financial_year", fyYear));
  }
  return false;
}

export function resolveStockForPeriod(
  snapshots: StockSnapshotRow[],
  dateFrom: string,
  dateTo: string,
  purchasesByProduct: Record<StockProduct, number>,
  dsrBoundaries?: DsrStockBoundaries | null
): StockPeriodSummary {
  const msOpening = resolveBoundaryLitres(snapshots, "MS", "opening", dateFrom, dsrBoundaries);
  const msClosing = resolveBoundaryLitres(snapshots, "MS", "closing", dateTo, dsrBoundaries);
  const hsdOpening = resolveBoundaryLitres(snapshots, "HSD", "opening", dateFrom, dsrBoundaries);
  const hsdClosing = resolveBoundaryLitres(snapshots, "HSD", "closing", dateTo, dsrBoundaries);

  const ms = buildProductMovement("MS", msOpening, purchasesByProduct.MS, msClosing);
  const hsd = buildProductMovement("HSD", hsdOpening, purchasesByProduct.HSD, hsdClosing);

  const hasOpening = ms.openingLitres != null && hsd.openingLitres != null;
  const hasClosing = ms.closingLitres != null && hsd.closingLitres != null;
  const hasPartialOpening = ms.openingLitres != null || hsd.openingLitres != null;
  const hasPartialClosing = ms.closingLitres != null || hsd.closingLitres != null;

  const manualMsOpening = usedManualSnapshot(snapshots, "MS", "opening", dateFrom);
  const manualMsClosing = usedManualSnapshot(snapshots, "MS", "closing", dateTo);
  const manualHsdOpening = usedManualSnapshot(snapshots, "HSD", "opening", dateFrom);
  const manualHsdClosing = usedManualSnapshot(snapshots, "HSD", "closing", dateTo);
  const anyManual =
    manualMsOpening || manualMsClosing || manualHsdOpening || manualHsdClosing;
  const anyDsr =
    Boolean(dsrBoundaries) &&
    (["MS", "HSD"] as const).some((product) => {
      const usedManualOpening = product === "MS" ? manualMsOpening : manualHsdOpening;
      const usedManualClosing = product === "MS" ? manualMsClosing : manualHsdClosing;
      const dsrOpening = dsrBoundaries?.[product].opening != null && !usedManualOpening;
      const dsrClosing = dsrBoundaries?.[product].closing != null && !usedManualClosing;
      return dsrOpening || dsrClosing;
    });

  let coverage: StockCoverage = "none";
  let coverageNote: string | null = null;

  if (hasOpening && hasClosing) {
    const fyStartYear = fyStartYearForDate(dateFrom);
    const isFullFy = dateFrom === `${fyStartYear}-04-01` && dateTo === `${fyStartYear + 1}-03-31`;
    coverage = isFullFy ? "full" : "fy_boundaries";
    if (anyManual && anyDsr) {
      coverageNote =
        "Stock uses saved manual values where entered; remaining boundaries come from DSR.";
    } else if (anyDsr && !anyManual) {
      coverageNote =
        "Stock from DSR tank readings (closing uses next-day opening stock). Save manual values to override.";
    } else if (!isFullFy) {
      coverageNote =
        "Stock uses FY opening/closing at period boundaries. Add monthly stock for month-wise movement.";
    }
  } else if (hasPartialOpening || hasPartialClosing) {
    coverage = "partial";
    coverageNote = anyDsr
      ? "Stock data is incomplete for this period (partial DSR or manual entry)."
      : "Stock data is incomplete for this period.";
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
