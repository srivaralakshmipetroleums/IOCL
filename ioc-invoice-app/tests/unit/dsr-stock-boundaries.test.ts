import { describe, expect, it } from "vitest";
import { buildDsrLedgerRows } from "@/lib/iras/dsr/metrics";
import type { DsrStoredRecordEntry } from "@/lib/iras/dsr/query-helpers";
import {
  deriveDsrStockBoundaries,
  hasFullDsrStockBoundary,
  nextIsoDate,
} from "@/lib/stock/dsr-stock-boundaries";
import { resolveStockForPeriod } from "@/lib/stock/resolve-period";

function entry(
  product: "MS" | "HSD",
  date: string,
  opening: number,
  closing: number
): DsrStoredRecordEntry {
  return {
    product,
    dsrDate: date,
    record: {
      date_time: date,
      totalOpeningStock: opening,
      totalStock: closing,
    },
  };
}

describe("deriveDsrStockBoundaries", () => {
  it("uses first-day opening and next-day opening as month-end closing", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-08-2026", 13486.7, 13486.7),
      entry("MS", "31-08-2026", 6098.92, 15098.92),
      entry("MS", "01-09-2026", 14200, 14200),
      entry("HSD", "01-08-2026", 12885.2, 12885.2),
      entry("HSD", "31-08-2026", 8823.2, 13823.2),
      entry("HSD", "01-09-2026", 13900, 13900),
    ]);

    const boundaries = deriveDsrStockBoundaries(rows, "2026-08-01", "2026-08-31");

    expect(nextIsoDate("2026-08-31")).toBe("2026-09-01");
    expect(boundaries.MS.opening).toBe(13486.7);
    expect(boundaries.MS.closing).toBe(14200);
    expect(boundaries.HSD.opening).toBe(12885.2);
    expect(boundaries.HSD.closing).toBe(13900);
    expect(hasFullDsrStockBoundary(boundaries)).toBe(true);
  });

  it("falls back to last-day total stock when next-day opening is unavailable", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-08-2026", 100, 100),
      entry("MS", "31-08-2026", 80, 120),
    ]);

    const boundaries = deriveDsrStockBoundaries(rows, "2026-08-01", "2026-08-31");

    expect(boundaries.MS.opening).toBe(100);
    expect(boundaries.MS.closing).toBe(120);
  });
});

describe("resolveStockForPeriod with DSR fallback", () => {
  it("uses DSR when manual monthly snapshots are missing", () => {
    const dsrRows = buildDsrLedgerRows([
      entry("MS", "01-08-2026", 100, 100),
      entry("MS", "01-09-2026", 130, 130),
      entry("HSD", "01-08-2026", 200, 200),
      entry("HSD", "01-09-2026", 170, 170),
    ]);
    const boundaries = deriveDsrStockBoundaries(dsrRows, "2026-08-01", "2026-08-31");

    const result = resolveStockForPeriod([], "2026-08-01", "2026-08-31", { MS: 1000, HSD: 2000 }, boundaries);

    expect(result.ms.openingLitres).toBe(100);
    expect(result.ms.closingLitres).toBe(130);
    expect(result.hsd.openingLitres).toBe(200);
    expect(result.hsd.closingLitres).toBe(170);
    expect(result.ms.impliedSalesLitres).toBe(100 + 1000 - 130);
    expect(result.coverageNote).toContain("DSR");
  });

  it("prefers manual snapshots over DSR", () => {
    const dsrRows = buildDsrLedgerRows([
      entry("MS", "01-08-2026", 100, 100),
      entry("MS", "01-09-2026", 130, 130),
      entry("HSD", "01-08-2026", 200, 200),
      entry("HSD", "01-09-2026", 170, 170),
    ]);
    const boundaries = deriveDsrStockBoundaries(dsrRows, "2026-08-01", "2026-08-31");

    const result = resolveStockForPeriod(
      [
        {
          id: "1",
          scope: "month",
          period_key: "2026-08",
          product: "MS",
          snapshot_kind: "opening",
          quantity_litres: 999,
          effective_date: "2026-08-01",
          notes: null,
        },
      ],
      "2026-08-01",
      "2026-08-31",
      { MS: 1000, HSD: 2000 },
      boundaries
    );

    expect(result.ms.openingLitres).toBe(999);
    expect(result.ms.closingLitres).toBe(130);
    expect(result.hsd.openingLitres).toBe(200);
  });
});
