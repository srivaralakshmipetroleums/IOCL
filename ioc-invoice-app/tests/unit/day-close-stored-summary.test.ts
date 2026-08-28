import { describe, expect, it } from "vitest";
import { summarizeDayClosing } from "@/lib/day-close/stored-to-compute";
import type { DayClosingRow } from "@/lib/day-close/repository";

function baseClosing(overrides: Partial<DayClosingRow> = {}): DayClosingRow {
  return {
    id: "1",
    business_date: "2026-08-23",
    ms_n1_start: 1000,
    ms_n1_close: 1100,
    ms_n2_start: 0,
    ms_n2_close: 0,
    ms_rsp: 100,
    hsd_n1_start: 2000,
    hsd_n1_close: 2050,
    hsd_n2_start: 0,
    hsd_n2_close: 0,
    hsd_rsp: 90,
    ms: {
      testing: 0,
      oil_2t_packets_10: 0,
      oil_2t_packets_20: 0,
      oil_2t_packets: 0,
      other_lubes_qty: 0,
      other_lubes_rate: 0,
      other_lubes: 0,
      cash_rows: [{ id: "1", time: "", amount: 10000 }],
      phonepe_paytm: 0,
      pos_cards: 0,
      credit_rows: [{ id: "1", description: "", amount: 0 }],
      expense_rows: [{ id: "1", description: "", amount: 0 }],
      pump_boy: "kumar",
    },
    hsd: {
      testing: 0,
      oil_2t_packets_10: 0,
      oil_2t_packets_20: 0,
      oil_2t_packets: 0,
      other_lubes_qty: 0,
      other_lubes_rate: 0,
      other_lubes: 0,
      cash_rows: [{ id: "1", time: "", amount: 4500 }],
      phonepe_paytm: 0,
      pos_cards: 0,
      credit_rows: [{ id: "1", description: "", amount: 0 }],
      expense_rows: [{ id: "1", description: "", amount: 0 }],
      pump_boy: "kumar",
    },
    notes: null,
    ...overrides,
  };
}

describe("day close stored summary", () => {
  it("summarizes saved day closing litres and receipts", () => {
    const summary = summarizeDayClosing(baseClosing());
    expect(summary.msSaleLitres).toBe(100);
    expect(summary.hsdSaleLitres).toBe(50);
    expect(summary.msTotalReceipts).toBe(10000);
    expect(summary.hsdTotalReceipts).toBe(4500);
    expect(summary.msPumpBoy).toBe("kumar");
  });
});
