import { describe, expect, it } from "vitest";
import { generateBankExcelReport } from "@/lib/reports/bank-excel-report";
import { BANK_SHEET_NAMES } from "@/lib/reports/bank-report-format";
import type { BankReportDataset } from "@/lib/reports/load-bank-report";

function sampleDataset(): BankReportDataset {
  return {
    period: { dateFrom: "2026-03-01", dateTo: "2026-03-31", label: "Mar 2026" },
    generatedAt: "2026-08-21T12:00:00.000Z",
    account: {
      accountName: "SRI VARALAKSHMI PETROLEUMS",
      accountNumber: "39441313694",
      ifsc: "SBIN0002766",
      branch: "MAIN BRANCH",
      fyLabels: ["FY 2025-26"],
    },
    summary: {
      openingBalance: 100000,
      closingBalance: 200000,
      totalCredits: 500000,
      totalDebits: 400000,
      netMovement: 100000,
      cashDeposits: 100000,
      phonePe: 50000,
      paytm: 30000,
      cardSettlements: 0,
      posCards: 10000,
      upiIn: 5000,
      ioclPayments: 350000,
      bankCharges: 1000,
      salary: 0,
      transactionCount: 10,
      ioclCredits: 0,
      totalCollections: 195000,
      digitalCollections: 95000,
      netOperatingCash: -156000,
      missedWalletDays: 1,
    },
    cashFlow: [
      {
        month: "2026-03",
        creditsIn: 500000,
        debitsOut: 400000,
        cashDeposits: 100000,
        digitalCollections: 95000,
        ioclPayments: 350000,
        charges: 1000,
        phonePe: 50000,
        paytm: 30000,
        cardSettlements: 0,
        posCards: 10000,
        upiIn: 5000,
        salary: 0,
        netMovement: 100000,
        closingBalance: 200000,
      },
    ],
    transactions: [
      {
        id: "t1",
        statement_id: "s1",
        line_number: 1,
        txn_date: "2026-03-02",
        value_date: null,
        description: "TO TRANSFER-INB RTGS UTR NO: SBINR12026030218612949--IOCL",
        reference_no: "RTGS IOCL",
        branch_code: "001",
        debit: 1000000,
        credit: 0,
        balance: 150000,
        category: "IOCL_PAYMENT",
      },
      {
        id: "t2",
        statement_id: "s1",
        line_number: 2,
        txn_date: "2026-03-03",
        value_date: null,
        description: "BY TRANSFER-NEFT PHONEPE",
        reference_no: "NEFT",
        branch_code: "001",
        debit: 0,
        credit: 25000,
        balance: 175000,
        category: "PHONEPE",
      },
    ],
    categories: [],
    transferChannels: [
      {
        category: "RTGS",
        label: "RTGS",
        count: 1,
        debit: 1000000,
        credit: 0,
        parties: [{ label: "IOCL", count: 1, debit: 1000000, credit: 0 }],
      },
    ],
    walletMissedDays: [{ date: "2026-03-05", missedPhonePe: true, missedPaytm: false }],
    reconciliation: [
      {
        status: "MATCHED",
        utr: "26030218612949",
        bankDate: "2026-03-02",
        bankAmount: 1000000,
        padDate: "2026-03-02",
        padAmount: 1000000,
        difference: null,
        bankRef: "RTGS IOCL",
        padRef: "SBIN26030218612949",
        note: null,
      },
    ],
    reconciliationSummary: {
      total: 1,
      matched: 1,
      amountMismatch: 0,
      bankOnly: 0,
      padOnly: 0,
      bankTotal: 1000000,
      padTotal: 1000000,
    },
    outflowByMonth: [
      { period: "2026-03", bankCharges: 1000, salary: 0, ioclPayments: 1000000, total: 1001000 },
    ],
    outflowByYear: [
      { period: "2026", bankCharges: 1000, salary: 0, ioclPayments: 1000000, total: 1001000 },
    ],
  };
}

describe("bank excel report", () => {
  it("generates a workbook with all seven sheets", async () => {
    const { buffer, filename } = await generateBankExcelReport(sampleDataset());
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(filename).toBe("Bank_Statement_Mar_2026.xlsx");

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([...BANK_SHEET_NAMES]);
    expect(workbook.getWorksheet("Summary")?.getCell("A3").value).toBe("Account");
    expect(workbook.getWorksheet("PAD Reconciliation")?.rowCount).toBeGreaterThan(2);
  });
});
