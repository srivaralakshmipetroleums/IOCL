import { describe, expect, it } from "vitest";
import { generatePadExcelReport } from "@/lib/reports/pad-excel-report";
import type { PadReportDataset } from "@/lib/reports/load-pad-report";

function sampleDataset(): PadReportDataset {
  return {
    period: { dateFrom: "2020-05-01", dateTo: "2020-05-31", label: "May 2020" },
    dealerName: "SRI VARALAKSHMI PETROLEUMS",
    customerCode: "330042",
    generatedAt: "2026-08-19T12:00:00.000Z",
    summary: {
      openingBalance: 1,
      closingBalance: 2,
      totalCredits: 3,
      totalDebits: 4,
      netMovement: -1,
      openDeliveryValue: null,
      moneyInvested: 3,
      moneyInvestedSbi: 2,
      moneyInvestedFleet: 1,
      fuelPurchaseValue: 4,
      fuelQuantityKl: 12,
      fuelMsKl: 4,
      fuelHsdKl: 8,
      retailRevenue: 5,
      grossPumpProfit: 6,
      marginTotal: 7,
      discountTotal: 8,
      feesTotal: 9,
      missingRetailPriceCount: 0,
      fuelSupplyRowCount: 1,
    },
    rateTrend: [
      {
        month: "2020-05",
        msPurchasePerL: 71.5,
        hsdPurchasePerL: 66.5,
        msRetailPerL: 82.76,
        hsdRetailPerL: 76.98,
        msSpreadPerL: 11.26,
        hsdSpreadPerL: 10.48,
        msKl: 4,
        hsdKl: 8,
        totalKl: 12,
      },
    ],
    cashFlow: [
      {
        month: "2020-05",
        creditsIn: 100,
        debitsOut: 80,
        payments: 100,
        margin: 0,
        discounts: 0,
        fuelDebits: 80,
        charges: 0,
      },
    ],
    grossProfitByMonth: [
      {
        month: "2020-05",
        msProfit: 10,
        hsdProfit: 20,
        dealerMargin: 5,
        discount: 1,
        charges: 2,
        fuelProfit: 30,
        netProfit: 34,
      },
    ],
    fuelLines: [
      {
        invoiceDate: "2020-05-29",
        billNo: "0731341681",
        product: "EBMS",
        quantityKl: 4,
        quantityL: 4000,
        invoiceValue: 286032,
        purchasePerL: 71.5,
        rspPerL: 82.76,
        spreadPerL: 11.26,
        lineProfit: 45040,
        hsn: "27101241",
      },
    ],
    transactions: [
      {
        id: "t1",
        statement_id: "s1",
        line_number: 1,
        plant: "4453",
        item_text: "0731341681",
        document_type: "Billing doc.transfer",
        document_number: "0731341681",
        transaction_date: "2020-05-29",
        material_group: "BULK-HSD",
        quantity: 8,
        unit: "KL",
        debit: 817780,
        credit: 0,
        balance: 1000,
        category: "FUEL_HSD",
      },
    ],
    charges: {
      byType: [{ name: "Licence fee", count: 1, totalDebit: 100 }],
      byMonth: [{ period: "2020-05", total: 100, byName: { "Licence fee": 100 } }],
      byYear: [{ period: "2020", total: 100, byName: { "Licence fee": 100 } }],
      items: [
        {
          id: "c1",
          date: "2020-05-29",
          name: "Licence fee",
          reference: "SSLF",
          amount: 100,
        },
      ],
      periodTotal: 100,
    },
    moneyIn: [
      { date: "2020-05-29", type: "SBI deposit", reference: "UTR1", credit: 500000 },
    ],
    reconciliation: [
      {
        padTransactionId: "t1",
        billingDoc: "0731341681",
        padDate: "2020-05-29",
        padDebit: 817780,
        padQuantityKl: 8,
        product: "HSD",
        invoiceId: "i1",
        invoiceNumber: "0731341681",
        invoiceDate: "2020-05-29",
        invoiceTotal: 817780,
        invoiceQuantityKl: 12,
        status: "MATCHED",
        mismatchReason: null,
      },
    ],
    reconciliationSummary: {
      total: 1,
      matched: 1,
      padOnly: 0,
      invoiceOnly: 0,
      mismatches: 0,
    },
    retailPrices: [
      {
        product: "MS",
        effective_from: "2020-05-01",
        price_per_litre: 82.76,
        notes: "June RSP",
        source_type: "MANUAL",
      },
    ],
  };
}

describe("generatePadExcelReport", () => {
  it("writes an xlsx buffer with eight worksheets", async () => {
    const { buffer, filename } = await generatePadExcelReport(sampleDataset());
    expect(filename).toBe("PAD_Account_May_2020.xlsx");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
