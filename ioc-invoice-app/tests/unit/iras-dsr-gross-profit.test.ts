import { describe, expect, it } from "vitest";
import { buildRetailPriceLookup } from "@/lib/pad/retail-price-lookup";
import {
  buildPurchaseRateLookup,
  computeDsrRowGrossProfit,
} from "@/lib/iras/dsr/gross-profit";
import { computeDsrExecutiveSummary } from "@/lib/iras/dsr/metrics";
import { normalizeDsrRecord } from "@/lib/iras/dsr/normalize";

describe("buildPurchaseRateLookup", () => {
  it("uses the latest invoice rate on or before the sale date", () => {
    const lookup = buildPurchaseRateLookup(
      new Map([
        [
          "2025-12-01::MS",
          { date: "2025-12-01", product: "MS", litres: 1000, value: 90000 },
        ],
        [
          "2025-12-20::MS",
          { date: "2025-12-20", product: "MS", litres: 1000, value: 95000 },
        ],
      ])
    );

    expect(lookup("MS", "2025-12-15")).toBe(90);
    expect(lookup("MS", "2025-12-31")).toBe(95);
  });
});

describe("computeDsrRowGrossProfit", () => {
  it("uses totalizer litres times (RSP minus purchase rate)", () => {
    const rspLookup = buildRetailPriceLookup([
      { product: "MS", effective_from: "2025-12-01", price_per_litre: 105, notes: null },
    ]);
    const purchaseLookup = buildPurchaseRateLookup(
      new Map([
        [
          "2025-12-01::MS",
          { date: "2025-12-01", product: "MS", litres: 1000, value: 95000 },
        ],
      ])
    );

    const profit = computeDsrRowGrossProfit(
      { date: "2025-12-31", product: "MS", netTotalizerSales: 100 },
      rspLookup,
      purchaseLookup
    );

    expect(profit).toBe(1000);
  });

  it("does not treat gross retail value as margin for Jan 2026 sample rates", () => {
    const rspLookup = buildRetailPriceLookup([
      { product: "MS", effective_from: "2026-01-01", price_per_litre: 109.87, notes: null },
    ]);
    const purchaseLookup = buildPurchaseRateLookup(
      new Map([
        [
          "2026-01-05::MS",
          { date: "2026-01-05", product: "MS", litres: 9000, value: 952249.12 },
        ],
      ])
    );

    const profit = computeDsrRowGrossProfit(
      { date: "2026-01-15", product: "MS", netTotalizerSales: 1688.3 },
      rspLookup,
      purchaseLookup
    );

    expect(profit).toBe(6854.5);
    expect(profit).not.toBe(185493.52);
  });
});

describe("computeDsrExecutiveSummary gross profit totals", () => {
  it("sums daily gross profit separately for MS and HSD", () => {
    const rspLookup = buildRetailPriceLookup([
      { product: "MS", effective_from: "2025-04-01", price_per_litre: 100, notes: null },
      { product: "HSD", effective_from: "2025-04-01", price_per_litre: 90, notes: null },
    ]);
    const purchaseLookup = buildPurchaseRateLookup(
      new Map([
        ["2025-04-01::MS", { date: "2025-04-01", product: "MS", litres: 100, value: 9000 }],
        ["2025-04-02::HSD", { date: "2025-04-02", product: "HSD", litres: 100, value: 8100 }],
      ])
    );

    const rows = [
      {
        ...normalizeDsrRecord(
          { date_time: "01-04-2025", netTotalizerSales: "10" },
          "MS",
          "01-04-2025"
        )!,
        grossProfit: computeDsrRowGrossProfit(
          { date: "2025-04-01", product: "MS", netTotalizerSales: 10 },
          rspLookup,
          purchaseLookup
        ),
      },
      {
        ...normalizeDsrRecord(
          { date_time: "02-04-2025", netTotalizerSales: "20" },
          "HSD",
          "02-04-2025"
        )!,
        grossProfit: computeDsrRowGrossProfit(
          { date: "2025-04-02", product: "HSD", netTotalizerSales: 20 },
          rspLookup,
          purchaseLookup
        ),
      },
    ];

    const summary = computeDsrExecutiveSummary(rows, "2025-04-01", "2025-04-02");

    expect(summary.totalMsGrossProfit).toBe(100);
    expect(summary.totalHsdGrossProfit).toBe(180);
    expect(summary.totalGrossProfit).toBe(280);
  });
});
