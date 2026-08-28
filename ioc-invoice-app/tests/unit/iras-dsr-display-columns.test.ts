import { describe, expect, it } from "vitest";
import { resolveDsrTableColumns } from "@/lib/iras/dsr/display-columns";

describe("resolveDsrTableColumns", () => {
  it("uses stored IRAS column order and appends extra record keys", () => {
    const columns = resolveDsrTableColumns(
      ["date_time", "netTankSales", "testing"],
      [
        {
          date_time: "01-08-2026",
          netTankSales: "100.00",
          testing: "1.00",
          netTransactionSales: "99.00",
        },
      ]
    );

    expect(columns).toEqual(["date_time", "netTankSales", "testing", "netTransactionSales"]);
  });

  it("falls back to record keys when columns are missing", () => {
    const columns = resolveDsrTableColumns(null, [
      { date_time: "01-08-2026", netTankSales: "100.00" },
    ]);

    expect(columns).toEqual(["date_time", "netTankSales"]);
  });
});
