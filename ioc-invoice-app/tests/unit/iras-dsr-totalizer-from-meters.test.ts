import { describe, expect, it } from "vitest";
import {
  applyTotalizerFromMetersToRecord,
  computeNetTotalizerFromMeterDelta,
  enrichDsrStoredEntriesWithTotalizerFromMeters,
  DEFAULT_DSR_TESTING_LITRES_PER_DAY,
  hasStoredTotalizerSales,
  listTotalizerBackfillCandidates,
  needsTotalizerBackfill,
  needsTestingBackfill,
  resolveTestingLitres,
} from "@/lib/iras/dsr/totalizer-from-meters";
import type { DsrStoredRecordEntry } from "@/lib/iras/dsr/query-helpers";

function entry(
  dsrDate: string,
  product: "MS" | "HSD",
  record: Record<string, string | number>
): DsrStoredRecordEntry {
  return { dsrDate, product, record };
}

describe("totalizer-from-meters", () => {
  it("detects stored vs missing netTotalizerSales", () => {
    expect(hasStoredTotalizerSales({ netTotalizerSales: "1688.30" })).toBe(true);
    expect(hasStoredTotalizerSales({ netTotalizerSales: "0.00" })).toBe(false);
    expect(needsTotalizerBackfill({ netTotalizerSales: "0.00" })).toBe(true);
    expect(hasStoredTotalizerSales({ netTankSales: "100" })).toBe(false);
  });

  it("defaults testing to 10 L per product per day when stored value is zero", () => {
    expect(resolveTestingLitres({ testing: "0" })).toBe(DEFAULT_DSR_TESTING_LITRES_PER_DAY);
    expect(resolveTestingLitres({})).toBe(DEFAULT_DSR_TESTING_LITRES_PER_DAY);
    expect(resolveTestingLitres({ testing: "15" })).toBe(15);
  });

  it("computes net totalizer from nozzle meter deltas minus testing", () => {
    const litres = computeNetTotalizerFromMeterDelta(
      { n1: 1000, n2: 500 },
      { n1: 900, n2: 450 },
      5,
      "MS"
    );
    expect(litres).toBe(145);
  });

  it("rejects implausible daily totals from month-open meter baselines", () => {
    const litres = computeNetTotalizerFromMeterDelta(
      { n1: 184393.17, n2: 160620.27 },
      { n1: 160015.46, n2: 147125.35 },
      0,
      "MS"
    );
    expect(litres).toBeNull();
  });

  it("fills missing netTotalizerSales when previous day meters exist", () => {
    const previous = entry("31-12-2020", "MS", {
      date_time: "31-12-2020",
      nozzle_tank_t2_1: "1000",
      nozzle_tank_t2_2: "500",
    });
    const current = entry("01-01-2021", "MS", {
      date_time: "01-01-2021",
      nozzle_tank_t2_1: "1100",
      nozzle_tank_t2_2: "550",
      testing: "10",
    });

    const enriched = enrichDsrStoredEntriesWithTotalizerFromMeters([previous, current]);
    expect(enriched[1]?.record.netTotalizerSales).toBe(140);
  });

  it("fills zero netTotalizerSales when meters show a realistic daily delta", () => {
    const entries = [
      entry("04-05-2021", "MS", {
        date_time: "04-05-2021",
        nozzle_tank_t2_1: "212216.12",
        nozzle_tank_t2_2: "176075.39",
        netTotalizerSales: "0",
      }),
      entry("05-05-2021", "MS", {
        date_time: "05-05-2021",
        nozzle_tank_t2_1: "213219.33",
        nozzle_tank_t2_2: "176767.05",
        netTotalizerSales: "0",
        receiptAsAutomation: "8000",
      }),
    ];

    const enriched = enrichDsrStoredEntriesWithTotalizerFromMeters(entries);
    expect(enriched[1]?.record.netTotalizerSales).toBe(1684.87);
    expect(enriched[1]?.record.testing).toBe(DEFAULT_DSR_TESTING_LITRES_PER_DAY);
  });

  it("does not overwrite existing netTotalizerSales", () => {
    const previous = entry("31-12-2020", "MS", {
      nozzle_tank_t2_1: "1000",
      nozzle_tank_t2_2: "500",
    });
    const current = entry("01-01-2021", "MS", {
      nozzle_tank_t2_1: "1100",
      nozzle_tank_t2_2: "550",
      netTotalizerSales: "999",
    });

    const updated = applyTotalizerFromMetersToRecord(
      current.record,
      "MS",
      previous.record
    );
    expect(updated.netTotalizerSales).toBe("999");
  });

  it("lists backfill candidates for incomplete rows", () => {
    const entries = [
      entry("31-12-2020", "MS", {
        date_time: "31-12-2020",
        nozzle_tank_t2_1: "1000",
        nozzle_tank_t2_2: "500",
      }),
      entry("01-01-2021", "MS", {
        date_time: "01-01-2021",
        nozzle_tank_t2_1: "1200",
        nozzle_tank_t2_2: "600",
        receiptAsAutomation: "50",
      }),
    ];

    const candidates = listTotalizerBackfillCandidates(entries);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.isoDate).toBe("2021-01-01");
    expect(candidates[0]?.computedLitres).toBe(290);
  });
});
