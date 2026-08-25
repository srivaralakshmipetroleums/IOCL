import { describe, expect, it } from "vitest";
import { computeDayClose, TWO_T_PACKET_PRICE } from "@/lib/day-close/calculate";

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
  it("subtracts combined testing litres after N1 + N2 net sale", () => {
    const result = computeDayClose({
      ms: {
        n1: { start: 1000, close: 1100 },
        n2: { start: 2000, close: 2050 },
        testingLitres: 3,
        rspPerLitre: 100,
        oil2tPackets: 3,
        otherLubesQty: 2,
        otherLubesRate: 20,
        ...emptyReceipts(),
      },
      hsd: {
        n1: { start: 0, close: 0 },
        n2: { start: 0, close: 0 },
        testingLitres: 0,
        rspPerLitre: 90,
        oil2tPackets: 0,
        otherLubesQty: 0,
        otherLubesRate: 0,
        ...emptyReceipts(),
      },
    });

    expect(result.ms.n1NetLitres).toBe(100);
    expect(result.ms.n2NetLitres).toBe(50);
    expect(result.ms.totalNetLitres).toBe(150);
    expect(result.ms.saleLitres).toBe(147);
    expect(result.ms.fuelAmount).toBe(14700);
    expect(result.ms.oil2tValue).toBe(3 * TWO_T_PACKET_PRICE);
    expect(result.ms.otherLubes).toBe(40);
    expect(result.ms.netValue).toBe(14700 + 30 + 40);
  });

  it("tallies MS and HSD receipts separately", () => {
    const result = computeDayClose({
      ms: {
        n1: { start: 0, close: 10 },
        n2: { start: 0, close: 0 },
        testingLitres: 0,
        rspPerLitre: 100,
        oil2tPackets: 0,
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
        oil2tPackets: 0,
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
