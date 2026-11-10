import { describe, expect, it } from "vitest";
import { attachGrossProfitToLedgerRows } from "@/lib/iras/dsr/gross-profit";
import {
  computeDsrLedgerTotals,
  parseDsrLedgerVisibleKeys,
  resolveDsrLedgerExportColumns,
} from "@/lib/iras/dsr/ledger-columns";
import { generateDsrLedgerExcel } from "@/lib/iras/dsr/ledger-excel";
import { normalizeDsrRecord } from "@/lib/iras/dsr/normalize";

function sampleRow(
  product: "MS" | "HSD",
  dateDisplay: string,
  extras: Record<string, string | number> = {}
) {
  return normalizeDsrRecord({ date_time: dateDisplay, ...extras }, product, dateDisplay)!;
}

describe("resolveDsrLedgerExportColumns", () => {
  it("always includes RSP even when it is not selected", () => {
    const columns = resolveDsrLedgerExportColumns(["receiptAsAutomation", "netTotalizerSales"]);
    expect(columns.map((column) => column.key)).toEqual([
      "receiptAsAutomation",
      "netTotalizerSales",
      "rspPerLitre",
    ]);
  });

  it("keeps selected measures in ledger order", () => {
    const columns = resolveDsrLedgerExportColumns(["grossProfit", "receiptAsAutomation"]);
    expect(columns.map((column) => column.key)).toEqual([
      "receiptAsAutomation",
      "rspPerLitre",
      "grossProfit",
    ]);
  });
});

describe("computeDsrLedgerTotals", () => {
  it("sums receipt, net totalizer sales, and gross profit", () => {
    const totals = computeDsrLedgerTotals([
      {
        ...sampleRow("MS", "01-04-2025", { receiptAsAutomation: "100", netTotalizerSales: "50" }),
        grossProfit: 10.125,
      },
      {
        ...sampleRow("HSD", "01-04-2025", { receiptAsAutomation: "20.5", netTotalizerSales: "30" }),
        grossProfit: 2.5,
      },
    ]);

    expect(totals.receiptAsAutomation).toBe(120.5);
    expect(totals.netTotalizerSales).toBe(80);
    expect(totals.grossProfit).toBe(12.63);
  });
});

describe("parseDsrLedgerVisibleKeys", () => {
  it("drops unknown keys and duplicates", () => {
    expect(parseDsrLedgerVisibleKeys(["grossProfit", "nope", "grossProfit", "rspPerLitre"])).toEqual([
      "grossProfit",
      "rspPerLitre",
    ]);
  });
});

describe("attachGrossProfitToLedgerRows", () => {
  it("attaches the RSP in force on that date", () => {
    const rows = attachGrossProfitToLedgerRows(
      [sampleRow("MS", "15-04-2025", { netTotalizerSales: "10" })],
      [{ product: "MS", effective_from: "2025-04-01", price_per_litre: 105.5, notes: null }],
      new Map([
        ["2025-04-01::MS", { date: "2025-04-01", product: "MS", litres: 100, value: 9500 }],
      ])
    );

    expect(rows[0].rspPerLitre).toBe(105.5);
    expect(rows[0].grossProfit).toBe(105);
  });
});

describe("generateDsrLedgerExcel", () => {
  it("writes selected columns, RSP, and a totals row", async () => {
    const { buffer, filename } = await generateDsrLedgerExcel({
      dateFrom: "2025-04-01",
      dateTo: "2025-04-30",
      label: "April 2025",
      columnKeys: ["receiptAsAutomation", "netTotalizerSales", "grossProfit"],
      rows: [
        {
          ...sampleRow("MS", "01-04-2025", {
            receiptAsAutomation: "100",
            netTotalizerSales: "40",
          }),
          rspPerLitre: 100,
          grossProfit: 200,
        },
        {
          ...sampleRow("HSD", "01-04-2025", {
            receiptAsAutomation: "50",
            netTotalizerSales: "20",
          }),
          rspPerLitre: 90,
          grossProfit: 80,
        },
      ],
    });

    expect(filename).toBe("DSR_Ledger_2025-04-01_to_2025-04-30.xlsx");

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet("Daily ledger");
    expect(sheet).toBeTruthy();
    const header = sheet!.getRow(2);
    expect(header.getCell(1).value).toBe("Date");
    expect(header.getCell(2).value).toBe("Product");
    expect(header.getCell(3).value).toBe("Receipt");
    expect(header.getCell(4).value).toBe("Net totalizer sales");
    expect(header.getCell(5).value).toBe("RSP");
    expect(header.getCell(6).value).toBe("Gross profit");
    expect(sheet!.getRow(5).getCell(1).value).toBe("Totals");
    expect(sheet!.getRow(5).getCell(3).value).toBe(150);
    expect(sheet!.getRow(5).getCell(4).value).toBe(60);
    expect(sheet!.getRow(5).getCell(5).value).toBe("");
    expect(sheet!.getRow(5).getCell(6).value).toBe(280);
  });
});
