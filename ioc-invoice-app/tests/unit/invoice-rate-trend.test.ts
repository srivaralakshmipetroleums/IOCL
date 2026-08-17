import { describe, it, expect } from "vitest";
import {
  computeInvoiceGrossProfitByMonth,
  computeInvoiceMsHsdRateTrend,
} from "@/lib/pad/invoice-rate-trend";
import type { PadTransactionRow } from "@/lib/pad/types";

describe("invoice MS/HSD purchase rate trend", () => {
  it("uses invoice value divided by litres, split by product", () => {
    const trend = computeInvoiceMsHsdRateTrend(
      [
        { id: "i1", invoice_date: "2025-06-10" },
        { id: "i2", invoice_date: "2025-06-20" },
      ],
      [
        { invoice_id: "i1", product: "EBMS", invoice_value: 102400, output_quantity: 1000 },
        { invoice_id: "i1", product: "HSD-BSVI", invoice_value: 90000, output_quantity: 1000 },
        { invoice_id: "i2", product: "EBMS", invoice_value: 102400, output_quantity: 1000 },
      ],
      [
        { product: "MS", effective_from: "2025-01-01", price_per_litre: 109.87 },
        { product: "HSD", effective_from: "2025-01-01", price_per_litre: 97.67 },
      ]
    );

    expect(trend).toHaveLength(1);
    expect(trend[0].month).toBe("2025-06");
    expect(trend[0].msPurchasePerL).toBeCloseTo(102.4);
    expect(trend[0].hsdPurchasePerL).toBeCloseTo(90);
    expect(trend[0].msRetailPerL).toBe(109.87);
    expect(trend[0].hsdRetailPerL).toBe(97.67);
    expect(trend[0].msKl).toBe(2);
    expect(trend[0].hsdKl).toBe(1);
    expect(trend[0].totalKl).toBe(3);
    expect(trend[0].msSpreadPerL).toBeCloseTo(7.47);
    expect(trend[0].hsdSpreadPerL).toBeCloseTo(7.67);
  });

  it("adds PAD dealer margin and discounts and subtracts charges", () => {
    const trend = computeInvoiceMsHsdRateTrend(
      [{ id: "i1", invoice_date: "2025-06-10" }],
      [
        { invoice_id: "i1", product: "EBMS", invoice_value: 102400, output_quantity: 1000 },
        { invoice_id: "i1", product: "HSD-BSVI", invoice_value: 90000, output_quantity: 1000 },
      ],
      [
        { product: "MS", effective_from: "2025-01-01", price_per_litre: 109.87 },
        { product: "HSD", effective_from: "2025-01-01", price_per_litre: 97.67 },
      ]
    );

    const pad: PadTransactionRow[] = [
      {
        id: "m1",
        statement_id: "s",
        line_number: 1,
        plant: null,
        item_text: "DEALER MARGIN",
        document_type: "Billing doc.transfer",
        document_number: null,
        transaction_date: "2025-06-12",
        material_group: null,
        quantity: null,
        unit: null,
        debit: 0,
        credit: 10000,
        balance: 0,
        category: "MARGIN",
      },
      {
        id: "d1",
        statement_id: "s",
        line_number: 2,
        plant: null,
        item_text: "VOLUME DISCOUNT",
        document_type: "Billing doc.transfer",
        document_number: null,
        transaction_date: "2025-06-12",
        material_group: null,
        quantity: null,
        unit: null,
        debit: 0,
        credit: 2000,
        balance: 0,
        category: "DISCOUNT",
      },
      {
        id: "c1",
        statement_id: "s",
        line_number: 3,
        plant: null,
        item_text: "K1 PARTICIPATION FEE",
        document_type: "Customer debit memo",
        document_number: null,
        transaction_date: "2025-06-20",
        material_group: null,
        quantity: null,
        unit: null,
        debit: 500,
        credit: 0,
        balance: 0,
        category: "FEE",
      },
    ];

    const months = computeInvoiceGrossProfitByMonth(trend, pad);
    expect(months[0].msProfit).toBeCloseTo(7470);
    expect(months[0].hsdProfit).toBeCloseTo(7670);
    expect(months[0].dealerMargin).toBe(10000);
    expect(months[0].discount).toBe(2000);
    expect(months[0].charges).toBe(500);
    expect(months[0].netProfit).toBeCloseTo(7470 + 7670 + 10000 + 2000 - 500);
  });
});
