import { describe, expect, it } from "vitest";
import { buildDsrRecordRows } from "@/lib/iras/dsr/repository";

describe("buildDsrRecordRows", () => {
  it("maps each IRAS record to a dsr_date row without changing values", () => {
    const rows = buildDsrRecordRows("capture-1", "MS", [
      {
        date_time: "01-08-2026",
        netTankSales: "2121.00",
        totalStock: 13486.7,
      },
      {
        date_time: "02-08-2026",
        netTransactionSales: "1795.10",
      },
    ]);

    expect(rows).toEqual([
      {
        capture_id: "capture-1",
        dsr_date: "01-08-2026",
        product: "MS",
        record_data: {
          date_time: "01-08-2026",
          netTankSales: "2121.00",
          totalStock: 13486.7,
        },
      },
      {
        capture_id: "capture-1",
        dsr_date: "02-08-2026",
        product: "MS",
        record_data: {
          date_time: "02-08-2026",
          netTransactionSales: "1795.10",
        },
      },
    ]);
  });

  it("skips records without date_time", () => {
    const rows = buildDsrRecordRows("capture-1", "HSD", [{ netTankSales: "100.00" }]);
    expect(rows).toEqual([]);
  });

  it("dedupes rows by dsr_date and product", () => {
    const rows = buildDsrRecordRows("capture-1", "MS", [
      { date_time: "01-03-2026", netTankSales: "100.00" },
      { date_time: "01-03-2026", netTankSales: "200.00" },
      { date_time: "02-03-2026", netTankSales: "300.00" },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.dsr_date).toBe("01-03-2026");
    expect(rows[0]?.record_data).toEqual({ date_time: "01-03-2026", netTankSales: "200.00" });
    expect(rows[1]?.dsr_date).toBe("02-03-2026");
  });
});
