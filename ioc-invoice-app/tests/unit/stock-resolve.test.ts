import { describe, expect, it } from "vitest";
import { resolveStockForPeriod } from "@/lib/stock/resolve-period";
import type { StockSnapshotRow } from "@/lib/stock/types";

const fySnapshots: StockSnapshotRow[] = [
  {
    id: "1",
    scope: "financial_year",
    period_key: "2025",
    product: "MS",
    snapshot_kind: "opening",
    quantity_litres: 13264,
    effective_date: "2025-04-01",
    notes: null,
  },
  {
    id: "2",
    scope: "financial_year",
    period_key: "2025",
    product: "HSD",
    snapshot_kind: "opening",
    quantity_litres: 15231,
    effective_date: "2025-04-01",
    notes: null,
  },
  {
    id: "3",
    scope: "financial_year",
    period_key: "2025",
    product: "MS",
    snapshot_kind: "closing",
    quantity_litres: 10241,
    effective_date: "2026-03-31",
    notes: null,
  },
  {
    id: "4",
    scope: "financial_year",
    period_key: "2025",
    product: "HSD",
    snapshot_kind: "closing",
    quantity_litres: 12510,
    effective_date: "2026-03-31",
    notes: null,
  },
];

describe("stock period resolution", () => {
  it("resolves FY 2025-26 opening and closing stock", () => {
    const result = resolveStockForPeriod(
      fySnapshots,
      "2025-04-01",
      "2026-03-31",
      { MS: 500_000, HSD: 600_000 }
    );

    expect(result.coverage).toBe("full");
    expect(result.ms.openingLitres).toBe(13264);
    expect(result.hsd.openingLitres).toBe(15231);
    expect(result.ms.closingLitres).toBe(10241);
    expect(result.hsd.closingLitres).toBe(12510);
    expect(result.ms.impliedSalesLitres).toBe(13264 + 500_000 - 10241);
    expect(result.hsd.impliedSalesLitres).toBe(15231 + 600_000 - 12510);
    expect(result.totalImpliedSalesLitres).toBe(
      result.ms.impliedSalesLitres! + result.hsd.impliedSalesLitres!
    );
  });

  it("returns no stock boundaries for a month without monthly snapshots", () => {
    const result = resolveStockForPeriod(
      fySnapshots,
      "2025-05-01",
      "2025-05-31",
      { MS: 10_000, HSD: 12_000 }
    );

    expect(result.ms.openingLitres).toBeNull();
    expect(result.ms.closingLitres).toBeNull();
    expect(result.ms.purchasesLitres).toBe(10_000);
    expect(result.coverage).toBe("none");
  });
});
