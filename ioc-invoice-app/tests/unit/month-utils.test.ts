import { describe, it, expect } from "vitest";
import {
  getCompletedMonthsForComparison,
  getCurrentMonthKey,
} from "@/lib/dashboard/analytics/month-utils";
import type { MonthlyAnalyticsRow } from "@/lib/dashboard/analytics/types";

function monthRow(month: string): MonthlyAnalyticsRow {
  return {
    month,
    label: month,
    invoiceCount: 1,
    fuelValue: 100,
    ebmsQuantity: 1000,
    hsdQuantity: 1000,
    totalQuantity: 2000,
    ebmsValue: 50,
    hsdValue: 50,
    ebmsPricePerLitre: 0.05,
    hsdPricePerLitre: 0.05,
    ebmsMixPct: 50,
    hsdMixPct: 50,
    avgValuePerInvoice: 100,
    avgQuantityPerInvoice: 2000,
    cumulativeValue: 100,
    cumulativeQuantity: 2000,
    momInvoiceCountPct: null,
    momFuelValuePct: null,
    momQuantityPct: null,
    targetQuantityKl: null,
    targetValue: null,
    quantityVariancePct: null,
    valueVariancePct: null,
  };
}

describe("month utils", () => {
  it("returns current month key", () => {
    expect(getCurrentMonthKey(new Date(2026, 7, 16))).toBe("2026-08");
  });

  it("excludes the current month from multi-month comparisons", () => {
    const now = new Date(2026, 7, 16);
    const rows = [
      monthRow("2026-03"),
      monthRow("2026-04"),
      monthRow("2026-08"),
    ];

    expect(getCompletedMonthsForComparison(rows, now).map((row) => row.month)).toEqual([
      "2026-03",
      "2026-04",
    ]);
  });

  it("keeps the current month when it is the only month in the period", () => {
    const now = new Date(2026, 7, 16);
    expect(getCompletedMonthsForComparison([monthRow("2026-08")], now)).toHaveLength(1);
  });
});
