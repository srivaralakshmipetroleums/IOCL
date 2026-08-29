import { describe, expect, it } from "vitest";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { formatDsrDateValue, parseDsrExcelBuffer } from "@/lib/iras/dsr/parse-dsr-excel";
import { normalizeDsrRecord } from "@/lib/iras/dsr/normalize";

const SAMPLE_XLSX = path.resolve(
  __dirname,
  "../../../Docs/IRAS_DSR Report@29-08-2026 12_14_56.xlsx"
);

describe("formatDsrDateValue", () => {
  it("formats Date objects as DD-MM-YYYY", () => {
    expect(formatDsrDateValue(new Date(2026, 7, 1))).toBe("01-08-2026");
  });

  it("keeps DD-MM-YYYY strings", () => {
    expect(formatDsrDateValue("15-08-2026")).toBe("15-08-2026");
  });
});

describe("parseDsrExcelBuffer", () => {
  it("parses the IRAS monthly DSR Excel export for MS", async () => {
    const buffer = await readFile(SAMPLE_XLSX);
    const parsed = await parseDsrExcelBuffer(buffer, "MS", "IRAS_DSR Report.xlsx");

    expect(parsed.product).toBe("MS");
    expect(parsed.month).toBe(8);
    expect(parsed.year).toBe(2026);
    expect(parsed.tankLabel).toBe("Tank-1");
    expect(parsed.records.length).toBeGreaterThan(20);
    expect(parsed.records[0]?.date_time).toBe("01-08-2026");

    const first = parsed.records[0]!;
    expect(first.product_dip_1).toBe(1255.09);
    expect(first.product_qty_1).toBe(13486.7);
    expect(first.nozzle_tank_t2_1).toBe(2315284.03);
    expect(first.nozzle_tank_t2_2).toBe(1203780.44);
    expect(first.netTankSales).toBe(2121);
    expect(first.netTotalizerSales).toBe(2129.3);
    expect(first.testing).toBe(10);

    const ledger = normalizeDsrRecord(first, "MS");
    expect(ledger?.netTankSales).toBe(2121);
    expect(ledger?.netTotalizerSales).toBe(2129.3);
    expect(ledger?.productVolume).toBe(13486.7);
  });

  it("warns when product does not match tank label", async () => {
    const buffer = await readFile(SAMPLE_XLSX);
    const parsed = await parseDsrExcelBuffer(buffer, "HSD", "IRAS_DSR Report.xlsx");

    expect(parsed.warnings.some((warning) => warning.includes("Tank-1"))).toBe(true);
    expect(parsed.records[0]?.product_dip_2).toBe(1255.09);
    expect(parsed.records[0]?.nozzle_tank_t2_3).toBe(2315284.03);
    expect(parsed.records[0]?.nozzle_tank_t2_4).toBe(1203780.44);
  });
});
