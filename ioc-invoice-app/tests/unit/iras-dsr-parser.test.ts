import { describe, expect, it } from "vitest";
import { parseDsrResponse, summarizeDsrRecords } from "@/lib/iras/dsr/parser";

describe("parseDsrResponse", () => {
  it("parses columns, data, and totalCount", () => {
    const parsed = parseDsrResponse({
      columns: ["date_time", "netTankSales"],
      data: [
        {
          date_time: "01-08-2026",
          netTankSales: "2121.00",
          netTransactionSales: "2129.22",
        },
        {
          date_time: "02-08-2026",
          netTankSales: "1800.00",
          netTransactionSales: "1795.10",
        },
      ],
      totalCount: 2,
    });

    expect(parsed.totalCount).toBe(2);
    expect(parsed.columns).toEqual(["date_time", "netTankSales"]);
    expect(parsed.data).toHaveLength(2);
  });

  it("throws when data is missing", () => {
    expect(() => parseDsrResponse({ columns: [], totalCount: 0 })).toThrow(
      "Response.data is missing or not an array"
    );
  });
});

describe("summarizeDsrRecords", () => {
  it("returns first and last dates in DD-MM-YYYY order", () => {
    const summary = summarizeDsrRecords([
      { date_time: "15-08-2026" },
      { date_time: "01-08-2026" },
      { date_time: "31-08-2026" },
    ]);

    expect(summary.recordCount).toBe(3);
    expect(summary.firstDate).toBe("01-08-2026");
    expect(summary.lastDate).toBe("31-08-2026");
  });
});
