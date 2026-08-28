import { describe, expect, it } from "vitest";
import {
  dsrDateToIso,
  isoDateToDsrDisplay,
  normalizeDsrRecord,
} from "@/lib/iras/dsr/normalize";

describe("dsrDateToIso", () => {
  it("converts DD-MM-YYYY to ISO", () => {
    expect(dsrDateToIso("01-08-2026")).toBe("2026-08-01");
  });
});

describe("normalizeDsrRecord", () => {
  it("maps IRAS MS fields into ledger row", () => {
    const row = normalizeDsrRecord(
      {
        date_time: "31-12-2025",
        product_dip_1: "908.560",
        product_qty_1: "8964.280",
        totalOpeningStock: 8964.28,
        receiptAsAutomation: "0.00",
        totalStock: 8964.28,
        nozzle_tank_t2_1: "2063554.74",
        nozzle_tank_t2_2: "1048235.18",
        testing: "10.00",
        netTankSales: "1672.94",
        netTotalizerSales: "1688.30",
        netTransactionSales: "1688.28",
      },
      "MS",
      "31-12-2025"
    );

    expect(row?.productVolume).toBe(8964.28);
    expect(row?.netTankSales).toBe(1672.94);
    expect(row?.netTotalizerSales).toBe(1688.3);
    expect(row?.netTransactionSales).toBe(1688.28);
    expect(row?.nozzleN1).toBe(2063554.74);
  });
});

describe("isoDateToDsrDisplay", () => {
  it("converts ISO to DD-MM-YYYY", () => {
    expect(isoDateToDsrDisplay("2026-08-01")).toBe("01-08-2026");
  });
});
