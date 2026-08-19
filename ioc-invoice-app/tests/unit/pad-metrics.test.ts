import { describe, it, expect } from "vitest";
import { classifyFeeSubtype, chargeDisplayName, isChargeRow } from "@/lib/pad/fee-classify";
import {
  computeChargeReport,
  computeExecutiveSummary,
  computeFuelProfitRows,
  computeGrossProfitByMonth,
} from "@/lib/pad/metrics";
import {
  buildRetailPriceLookup,
  parseRetailPriceCsv,
} from "@/lib/pad/retail-price-lookup";
import { isFuelSupplyRow } from "@/lib/pad/query-helpers";
import type { PadTransactionRow } from "@/lib/pad/types";

function fuelRow(overrides: Partial<PadTransactionRow>): PadTransactionRow {
  return {
    id: "1",
    statement_id: "s1",
    line_number: 1,
    plant: null,
    item_text: "7004932630 ': PRODUCT SUPPLY INVOICE - SALES",
    document_type: "Billing doc.transfer",
    document_number: "7004932630",
    transaction_date: "2024-06-15",
    material_group: "BULK-MS",
    quantity: 5,
    unit: "KL",
    debit: 500000,
    credit: 0,
    balance: 1000000,
    category: "FUEL_MS",
    ...overrides,
  };
}

describe("pad metrics", () => {
  it("identifies fuel supply rows only", () => {
    expect(isFuelSupplyRow(fuelRow({}))).toBe(true);
    expect(
      isFuelSupplyRow(
        fuelRow({ item_text: "7004796410 ': LICENSE FEE (SSLF) RECOVERY" })
      )
    ).toBe(false);
    expect(
      isFuelSupplyRow(
        fuelRow({
          item_text: "0732293889",
          document_number: "0732293889",
          quantity: 10,
          category: "FUEL_HSD",
        })
      )
    ).toBe(true);
  });

  it("looks up retail price by effective-from date", () => {
    const lookup = buildRetailPriceLookup([
      { product: "MS", effective_from: "2024-01-01", price_per_litre: 100 },
      { product: "MS", effective_from: "2024-06-01", price_per_litre: 105 },
      { product: "HSD", effective_from: "2024-01-01", price_per_litre: 90 },
    ]);

    expect(lookup("MS", "2024-05-31")).toBe(100);
    expect(lookup("MS", "2024-06-15")).toBe(105);
    expect(lookup("HSD", "2024-06-15")).toBe(90);
    expect(lookup("MS", "2023-12-31")).toBeNull();
  });

  it("computes profit per fuel supply row", () => {
    const rows = computeFuelProfitRows(
      [fuelRow({})],
      [{ product: "MS", effective_from: "2024-01-01", price_per_litre: 110 }]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].quantityKl).toBe(5);
    expect(rows[0].purchaseCost).toBe(500000);
    expect(rows[0].retailRevenue).toBe(550000);
    expect(rows[0].grossProfit).toBe(50000);
  });

  it("computes executive summary totals", () => {
    const transactions: PadTransactionRow[] = [
      fuelRow({}),
      {
        ...fuelRow({ id: "2", category: "PAYMENT", credit: 600000, debit: 0 }),
        item_text: "UTR123",
        document_type: "Customer ECollection",
      },
      {
        ...fuelRow({ id: "3", category: "MARGIN", credit: 10000, debit: 0 }),
        item_text: "DEALER MARGIN",
      },
    ];

    const summary = computeExecutiveSummary(transactions, [], [
      { product: "MS", effective_from: "2024-01-01", price_per_litre: 110 },
    ]);

    expect(summary.moneyInvested).toBe(600000);
    expect(summary.moneyInvestedSbi).toBe(600000);
    expect(summary.moneyInvestedFleet).toBe(0);
    expect(summary.fuelPurchaseValue).toBe(500000);
    expect(summary.retailRevenue).toBe(550000);
    expect(summary.grossPumpProfit).toBe(50000);
    expect(summary.marginTotal).toBe(10000);
  });

  it("splits money invested into SBI vs fleet card", () => {
    const transactions: PadTransactionRow[] = [
      {
        ...fuelRow({ id: "p1", category: "PAYMENT", credit: 400000, debit: 0 }),
        item_text: "SBIN0002766_UTR",
        document_type: "Customer ECollection",
      },
      {
        ...fuelRow({ id: "p2", category: "PAYMENT", credit: 150000, debit: 0 }),
        item_text: "4000523459-0000006 20250417012595",
        document_type: "Fleet- Card Posting",
      },
    ];

    const summary = computeExecutiveSummary(transactions, [], []);
    expect(summary.moneyInvestedSbi).toBe(400000);
    expect(summary.moneyInvestedFleet).toBe(150000);
    expect(summary.moneyInvested).toBe(550000);
  });

  it("classifies fee subtypes", () => {
    expect(
      classifyFeeSubtype({
        ...fuelRow({ category: "FEE", debit: 100 }),
        item_text: "A6 RENTAL CHARGE",
      })
    ).toBe("RENTAL");
    expect(
      classifyFeeSubtype({
        ...fuelRow({ category: "INTEREST", debit: 50 }),
        item_text: "INTEREST",
      })
    ).toBe("INTEREST");
  });

  it("treats licence fee and e-lock recovery as charges, not fuel", () => {
    const license = fuelRow({
      item_text: "7004796410 ': LICENSE FEE (SSLF) RECOVERY",
      debit: 31107.91,
      quantity: null,
    });
    const elock = fuelRow({
      item_text: "C4 E-LOCK RECOVERY FROM DEALERS",
      category: "FEE",
      debit: 1400,
      quantity: null,
    });
    const supply = fuelRow({});

    expect(isChargeRow(license)).toBe(true);
    expect(chargeDisplayName(license)).toBe("Licence fee");
    expect(chargeDisplayName(elock)).toBe("C4 E-lock recovery");
    expect(isChargeRow(supply)).toBe(false);

    const report = computeChargeReport([license, elock, supply]);
    expect(report.periodTotal).toBeCloseTo(32507.91);
    expect(report.byType.map((r) => r.name)).toEqual(["Licence fee", "C4 E-lock recovery"]);
    expect(report.byMonth).toHaveLength(1);
    expect(report.items).toHaveLength(2);

    const summary = computeExecutiveSummary([license, elock, supply], [], []);
    expect(summary.feesTotal).toBeCloseTo(32507.91);
  });

  it("aggregates gross profit by month", () => {
    const profitRows = computeFuelProfitRows(
      [fuelRow({ transaction_date: "2024-06-15" })],
      [{ product: "MS", effective_from: "2024-01-01", price_per_litre: 110 }]
    );
    const byMonth = computeGrossProfitByMonth(profitRows);
    expect(byMonth[0].month).toBe("2024-06");
    expect(byMonth[0].total).toBe(50000);
  });
});

describe("retail price csv", () => {
  it("parses csv rows", () => {
    const csv = `product,effective_from,price_per_litre
MS,2024-01-01,102.50
HSD,01/06/2024,94.20`;

    const rows = parseRetailPriceCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].product).toBe("MS");
    expect(rows[1].effective_from).toBe("2024-06-01");
  });
});
