import { describe, expect, it } from "vitest";
import { computeFuelSalesReport, buildInvoiceProfitLines } from "@/lib/stock/fuel-sales-report";
import type { StockPeriodSummary } from "@/lib/stock/types";
import type { PadChargeReport } from "@/lib/pad/metrics";
import type { BankExecutiveSummary } from "@/lib/bank/metrics";
import type { PadTransactionRow } from "@/lib/pad/types";
import type { BankTransactionRow } from "@/lib/bank/types";

const stockFull: StockPeriodSummary = {
  coverage: "full",
  coverageNote: null,
  ms: {
    product: "MS",
    label: "Petrol (MS)",
    openingLitres: 10000,
    purchasesLitres: 50000,
    closingLitres: 8000,
    impliedSalesLitres: 52000,
  },
  hsd: {
    product: "HSD",
    label: "Diesel (HSD)",
    openingLitres: 12000,
    purchasesLitres: 60000,
    closingLitres: 10000,
    impliedSalesLitres: 62000,
  },
  totalOpeningLitres: 22000,
  totalPurchasesLitres: 110000,
  totalClosingLitres: 18000,
  totalImpliedSalesLitres: 114000,
};

const emptyCharges: PadChargeReport = {
  byType: [],
  byMonth: [],
  byYear: [],
  items: [],
  periodTotal: 0,
};

const bankSummary: BankExecutiveSummary = {
  openingBalance: 100000,
  closingBalance: 220000,
  totalCredits: 6_000_000,
  totalDebits: 4_030_000,
  netMovement: 1_970_000,
  cashDeposits: 5_000_000,
  phonePe: 1_000_000,
  paytm: 0,
  cardSettlements: 0,
  posCards: 0,
  upiIn: 0,
  ioclPayments: 4_000_000,
  bankCharges: 10_000,
  salary: 0,
  transactionCount: 0,
};

function padRow(partial: Partial<PadTransactionRow> & Pick<PadTransactionRow, "category">): PadTransactionRow {
  return {
    id: "p",
    statement_id: "s",
    line_number: 1,
    plant: null,
    item_text: "",
    document_type: null,
    document_number: null,
    transaction_date: "2025-04-01",
    material_group: null,
    quantity: null,
    unit: null,
    debit: 0,
    credit: 0,
    balance: null,
    ...partial,
  };
}

function bankRow(
  partial: Pick<BankTransactionRow, "category" | "description"> &
    Partial<Pick<BankTransactionRow, "debit" | "credit" | "reference_no">>
): BankTransactionRow {
  return {
    id: "b",
    statement_id: "s",
    line_number: 1,
    txn_date: "2025-04-01",
    value_date: "2025-04-01",
    reference_no: null,
    branch_code: null,
    debit: 0,
    credit: 0,
    balance: null,
    ...partial,
  };
}

describe("fuel sales report", () => {
  it("builds invoice lines with per-line purchase and RSP", () => {
    const { lines } = buildInvoiceProfitLines(
      [{ id: "1", invoice_date: "2025-04-10", invoice_number: "INV-1", sap_entry_number: null }],
      [
        {
          invoice_id: "1",
          product: "EBMS",
          invoice_value: 950_000,
          output_quantity: 10_000,
        },
      ],
      [{ product: "MS", effective_from: "2025-04-01", price_per_litre: 98, notes: null }]
    );

    expect(lines[0]?.purchasePerL).toBe(95);
    expect(lines[0]?.rspPerL).toBe(98);
    expect(lines[0]?.grossProfit).toBe(30_000);
  });

  it("builds CA-style P&L from stock, invoices, PAD and classified bank lines", () => {
    const report = computeFuelSalesReport({
      stock: stockFull,
      dateFrom: "2025-04-01",
      dateTo: "2025-04-30",
      invoices: [
        { id: "1", invoice_date: "2025-04-10", invoice_number: "A", sap_entry_number: null },
        { id: "2", invoice_date: "2025-04-12", invoice_number: "B", sap_entry_number: null },
      ],
      lineItems: [
        { invoice_id: "1", product: "EBMS", invoice_value: 4_750_000, output_quantity: 50_000 },
        { invoice_id: "2", product: "HSD-BSVI", invoice_value: 5_400_000, output_quantity: 60_000 },
      ],
      retailPrices: [
        { product: "MS", effective_from: "2025-04-01", price_per_litre: 98, notes: null },
        { product: "HSD", effective_from: "2025-04-01", price_per_litre: 93, notes: null },
      ],
      padTransactions: [
        padRow({ category: "MARGIN", credit: 50_000 }),
        padRow({ category: "DISCOUNT", credit: 10_000 }),
        padRow({ category: "OTHER", credit: 5_000, item_text: "YVR464-31.05.2025" }),
        padRow({ category: "INTEREST", debit: 2_000 }),
      ],
      padCharges: emptyCharges,
      bankTransactions: [
        bankRow({ category: "CASH_DEPOSIT", description: "CASH DEPOSIT", credit: 5_000_000 }),
        bankRow({ category: "PHONEPE", description: "PHONEPE SETTLEMENT", credit: 1_000_000 }),
        bankRow({ category: "UPI_CREDIT", description: "UPI/CR bulk", credit: 100_000 }),
        bankRow({ category: "IOCL_PAYMENT", description: "INDIAN OIL", debit: 4_000_000 }),
        bankRow({ category: "BANK_CHARGE", description: "CASH HANDLING CHARGES", debit: 10_000 }),
        bankRow({
          category: "NEFT",
          description: "TO TRANSFER TARUNI AGENCIES",
          debit: 25_000,
        }),
      ],
      bankSummary,
      padClosingBalance: 611_993,
    });

    expect(report.stockReconciliation.find((r) => r.product === "MS")?.actualSoldLitres).toBe(52000);
    expect(report.profitAndLoss.grossFuelProfit).toBe(342_000);
    expect(report.padMoney.dealerCommission).toBe(55_000);
    expect(report.padMoney.otherPadCharges).toBe(2_000);
    expect(report.padMoney.netPadContribution).toBe(53_000);
    expect(report.profitAndLoss.otherOperatingIncome).toBe(10_000);
    expect(report.profitAndLoss.bankCharges).toBe(10_000);
    expect(report.profitAndLoss.otherOperatingExpenses).toBe(25_000);
    expect(report.profitAndLoss.salaries).toBe(0);
    expect(report.profitAndLoss.netProfit).toBe(342_000 + 53_000 + 10_000 - 10_000 - 25_000);
    expect(report.bankReconciliation.walkInReceipts).toBe(6_000_000);
    expect(report.bankReconciliation.creditSaleCollections).toBe(100_000);
    expect(report.bankReconciliation.ioclPayments).toBe(4_000_000);
    expect(report.bankReconciliation.closingPadOutstanding).toBe(611_993);
    expect(report.profitAndLoss.lines.some((line) => line.label.startsWith("Other business expenses") && line.label.includes("1,50,000"))).toBe(false);
  });
});
