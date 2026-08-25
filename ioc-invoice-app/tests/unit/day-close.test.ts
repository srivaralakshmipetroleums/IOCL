import { describe, expect, it } from "vitest";
import {
  computeDayClose,
  TWO_T_PACKET_PRICE_10,
  TWO_T_PACKET_PRICE_20,
} from "@/lib/day-close/calculate";
import { extractDescribedSuggestions } from "@/lib/day-close/suggestions";

function emptyReceipts() {
  return {
    cashRows: [{ id: "1", time: "", amount: 0 }],
    phonePePaytm: 0,
    posCards: 0,
    creditRows: [{ id: "1", description: "", amount: 0 }],
    expenseRows: [{ id: "1", description: "", amount: 0 }],
  };
}

describe("day close totalizer tally", () => {
  it("adds ₹10 and ₹20 2T packets on MS and subtracts testing litres", () => {
    const result = computeDayClose({
      ms: {
        n1: { start: 1000, close: 1100 },
        n2: { start: 2000, close: 2050 },
        testingLitres: 3,
        rspPerLitre: 100,
        oil2tPackets10: 2,
        oil2tPackets20: 3,
        otherLubesQty: 2,
        otherLubesRate: 20,
        ...emptyReceipts(),
      },
      hsd: {
        n1: { start: 0, close: 0 },
        n2: { start: 0, close: 0 },
        testingLitres: 0,
        rspPerLitre: 90,
        oil2tPackets10: 0,
        oil2tPackets20: 0,
        otherLubesQty: 0,
        otherLubesRate: 0,
        ...emptyReceipts(),
      },
    });

    expect(result.ms.saleLitres).toBe(147);
    expect(result.ms.fuelAmount).toBe(14700);
    expect(result.ms.oil2tValue10).toBe(2 * TWO_T_PACKET_PRICE_10);
    expect(result.ms.oil2tValue20).toBe(3 * TWO_T_PACKET_PRICE_20);
    expect(result.ms.oil2tValue).toBe(2 * TWO_T_PACKET_PRICE_10 + 3 * TWO_T_PACKET_PRICE_20);
    expect(result.ms.otherLubes).toBe(40);
    expect(result.ms.netValue).toBe(
      14700 + 2 * TWO_T_PACKET_PRICE_10 + 3 * TWO_T_PACKET_PRICE_20 + 40
    );
  });

  it("tallies MS and HSD receipts separately", () => {
    const result = computeDayClose({
      ms: {
        n1: { start: 0, close: 10 },
        n2: { start: 0, close: 0 },
        testingLitres: 0,
        rspPerLitre: 100,
        oil2tPackets10: 0,
        oil2tPackets20: 0,
        otherLubesQty: 0,
        otherLubesRate: 0,
        cashRows: [{ id: "1", time: "", amount: 700 }],
        phonePePaytm: 200,
        posCards: 0,
        creditRows: [{ id: "1", description: "TMC", amount: 50 }],
        expenseRows: [{ id: "1", description: "Courier", amount: 50 }],
      },
      hsd: {
        n1: { start: 0, close: 5 },
        n2: { start: 0, close: 0 },
        testingLitres: 0,
        rspPerLitre: 90,
        oil2tPackets10: 0,
        oil2tPackets20: 0,
        otherLubesQty: 0,
        otherLubesRate: 0,
        cashRows: [{ id: "1", time: "", amount: 450 }],
        phonePePaytm: 0,
        posCards: 0,
        creditRows: [],
        expenseRows: [],
      },
    });

    expect(result.ms.netValue).toBe(1000);
    expect(result.ms.totalReceipts).toBe(1000);
    expect(result.ms.matched).toBe(true);
    expect(result.hsd.netValue).toBe(450);
    expect(result.hsd.totalReceipts).toBe(450);
    expect(result.hsd.matched).toBe(true);
  });
});

describe("day close described suggestions", () => {
  it("collects unique credit and expense names from saved day closings", () => {
    const suggestions = extractDescribedSuggestions([
      {
        ms_credit_rows: [{ description: "TMC", amount: 100 }],
        hsd_credit_rows: [{ description: "tmc", amount: 50 }],
        ms_expense_rows: [{ description: "Courier", amount: 20 }],
        hsd_expense_rows: [{ description: "Tea", amount: 10 }],
      },
      {
        ms_expense_rows: [{ description: "Courier", amount: 30 }],
        hsd_expense_rows: [{ description: "  ", amount: 0 }],
      },
    ]);

    expect(suggestions.credits).toEqual(["TMC"]);
    expect(suggestions.expenses).toEqual(["Courier", "Tea"]);
  });
});
