import { describe, expect, it } from "vitest";
import { computeDsrReceiptReconciliation } from "@/lib/iras/dsr/receipt-reconciliation";
import {
  buildDsrLedgerRows,
  buildDsrProductSalesSummary,
  computeDsrDailyVolume,
  computeDsrExecutiveSummary,
  listMissingDsrDates,
} from "@/lib/iras/dsr/metrics";
import type { DsrStoredRecordEntry } from "@/lib/iras/dsr/query-helpers";

function entry(
  product: "MS" | "HSD",
  date: string,
  record: Record<string, string | number>
): DsrStoredRecordEntry {
  return { product, dsrDate: date, record: { date_time: date, ...record } };
}

describe("buildDsrLedgerRows", () => {
  it("normalizes stored entries", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", { netTankSales: "100.00", netTotalizerSales: "105.00" }),
      entry("HSD", "01-04-2025", { netTankSales: "200.00", netTotalizerSales: "198.00" }),
    ]);

    expect(rows).toHaveLength(2);
  });
});

describe("computeDsrExecutiveSummary", () => {
  it("aggregates tank and totalizer litres", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", {
        netTankSales: "100.00",
        netTotalizerSales: "110.00",
        netTransactionSales: "108.00",
      }),
      entry("HSD", "02-04-2025", {
        netTankSales: "200.00",
        netTotalizerSales: "205.00",
        netTransactionSales: "204.00",
      }),
    ]);

    const summary = computeDsrExecutiveSummary(rows, "2025-04-01", "2025-04-02");

    expect(summary.totalMsTankLitres).toBe(100);
    expect(summary.totalHsdTankLitres).toBe(200);
    expect(summary.totalMsTotalizerLitres).toBe(110);
    expect(summary.totalHsdTotalizerLitres).toBe(205);
    expect(summary.totalMsTransactionLitres).toBe(108);
    expect(summary.totalHsdTransactionLitres).toBe(204);
    expect(summary.avgDailyMsTotalizerLitres).toBe(110);
    expect(summary.avgDailyHsdTotalizerLitres).toBe(205);
    expect(summary.daysCaptured).toBe(2);
  });

  it("builds per-product sales summary for KPIs and charts", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", {
        netTankSales: "100.00",
        netTotalizerSales: "110.00",
        netTransactionSales: "108.00",
      }),
      entry("HSD", "02-04-2025", {
        netTankSales: "200.00",
        netTotalizerSales: "205.00",
        netTransactionSales: "204.00",
      }),
    ]);

    const summary = computeDsrExecutiveSummary(rows, "2025-04-01", "2025-04-02");
    const productSales = buildDsrProductSalesSummary(summary);

    expect(productSales).toEqual([
      {
        product: "MS",
        tankLitres: 100,
        totalizerLitres: 110,
        transactionLitres: 108,
      },
      {
        product: "HSD",
        tankLitres: 200,
        totalizerLitres: 205,
        transactionLitres: 204,
      },
    ]);
  });

  it("computes average daily margin per product when gross profit is set", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", { netTotalizerSales: "100.00" }),
      entry("MS", "02-04-2025", { netTotalizerSales: "200.00" }),
    ]).map((row, index) => ({
      ...row,
      grossProfit: index === 0 ? 500 : 1000,
    }));

    const summary = computeDsrExecutiveSummary(rows, "2025-04-01", "2025-04-02");

    expect(summary.avgDailyMsGrossProfit).toBe(750);
  });
});

describe("computeDsrDailyVolume", () => {
  it("includes transaction litres in daily points", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", {
        netTankSales: "100.00",
        netTotalizerSales: "110.00",
        netTransactionSales: "108.00",
      }),
    ]);

    const daily = computeDsrDailyVolume(rows);

    expect(daily[0]).toMatchObject({
      date: "2025-04-01",
      msTankLitres: 100,
      msTotalizerLitres: 110,
      msTransactionLitres: 108,
      msGrossProfit: 0,
      hsdGrossProfit: 0,
    });
  });
});

describe("listMissingDsrDates", () => {
  it("returns dates without DSR rows", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", { netTankSales: "100.00" }),
    ]);

    expect(listMissingDsrDates(rows, "2025-04-01", "2025-04-02")).toEqual(["2025-04-02"]);
  });
});

describe("computeDsrReceiptReconciliation", () => {
  it("flags receipt mismatch against invoice litres", () => {
    const rows = buildDsrLedgerRows([
      entry("MS", "01-04-2025", { receiptAsAutomation: "5000.00" }),
    ]);
    const invoiceByDateProduct = new Map([
      [
        "2025-04-01::MS",
        { date: "2025-04-01", product: "MS" as const, litres: 4800, value: 400000 },
      ],
    ]);

    const result = computeDsrReceiptReconciliation(rows, invoiceByDateProduct);
    expect(result.rows[0]?.status).toBe("mismatch");
  });
});
