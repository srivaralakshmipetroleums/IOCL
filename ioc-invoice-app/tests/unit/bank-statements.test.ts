import { describe, expect, it } from "vitest";
import { categorizeBankTransaction } from "@/lib/bank/categorize";
import { computeBankSummary } from "@/lib/bank/metrics";
import { fyLabelFromDate, normalizeAccountNumber, toIsoDate } from "@/lib/bank/parse-consolidated-xlsx";
import type { BankTransactionRow } from "@/lib/bank/types";

describe("bank statement helpers", () => {
  it("normalizes SBI account numbers", () => {
    expect(normalizeAccountNumber("_00000039441313694")).toBe("39441313694");
  });

  it("builds FY labels from transaction dates", () => {
    expect(fyLabelFromDate("2021-04-01")).toBe("FY 2021-22");
    expect(fyLabelFromDate("2022-03-31")).toBe("FY 2021-22");
    expect(fyLabelFromDate("2024-04-02")).toBe("FY 2024-25");
  });

  it("parses ISO dates from Date objects", () => {
    expect(toIsoDate(new Date("2021-04-01T00:00:00.000Z"))).toBe("2021-04-01");
    expect(toIsoDate("1 Jan 2021")).toBe("2021-01-01");
    expect(toIsoDate("7 Sep 2021")).toBe("2021-09-07");
  });

  it("categorizes common SBI narrations", () => {
    expect(
      categorizeBankTransaction("TO TRANSFER-INB RTGS UTR NO: SBINR12024040313562001--IOCL", 850000, 0)
    ).toBe("IOCL_PAYMENT");
    expect(
      categorizeBankTransaction("BY TRANSFER-NEFT*YESB0000001*N091210552127895*PHONEPE PRIVATE--", 0, 14790)
    ).toBe("PHONEPE");
    expect(
      categorizeBankTransaction("BY TRANSFER-NEFT*YESB0000001*YESAP60012359946*PAYTM PAYMENTS S--", 0, 20157)
    ).toBe("PHONEPE");
    expect(
      categorizeBankTransaction("BULK POSTING-CR_SRI VARALAKSHMI PETROL 022000000294146", 0, 4370)
    ).toBe("CARD_SETTLEMENT");
    expect(
      categorizeBankTransaction(
        "BY TRANSFER-NEFT*ICIC0099999*ICIN209146646270*CREDIT CARD OPER-",
        0,
        430.69
      )
    ).toBe("POS_CARD");
    expect(
      categorizeBankTransaction("BY TRANSFER-NEFT*UTIB0001506*AXNPN30925099277*PHONEPE PRIVATE--", 0, 66696)
    ).toBe("PHONEPE");
    expect(
      categorizeBankTransaction("BY TRANSFER-NEFT*UTIB0000022*AXNPM01003507500*SOME VENDOR--", 0, 23240)
    ).toBe("NEFT");
    expect(categorizeBankTransaction("CASH DEPOSIT-CASH DEPOSIT SELF--", 0, 50000)).toBe("CASH_DEPOSIT");
    expect(
      categorizeBankTransaction("BY TRANSFER-UPI/CR/309227990330/REDDY G T/HSBC/8008882194/Paym--", 0, 30000)
    ).toBe("UPI_CREDIT");
    expect(categorizeBankTransaction("CASH HANDLING CHARGES---38976288", 59, 0)).toBe("BANK_CHARGE");
    expect(categorizeBankTransaction("TO TRANSFER-INB Salary Payment--", 10000, 0)).toBe("SALARY");
  });

  it("summarizes cash and IOCL totals", () => {
    const rows: BankTransactionRow[] = [
      {
        id: "1",
        statement_id: "s",
        line_number: 1,
        txn_date: "2024-04-01",
        value_date: "2024-04-01",
        description: "CASH",
        reference_no: null,
        branch_code: null,
        debit: 0,
        credit: 100,
        balance: 200,
        category: "CASH_DEPOSIT",
      },
      {
        id: "2",
        statement_id: "s",
        line_number: 2,
        txn_date: "2024-04-02",
        value_date: "2024-04-02",
        description: "IOCL",
        reference_no: null,
        branch_code: null,
        debit: 80,
        credit: 0,
        balance: 120,
        category: "IOCL_PAYMENT",
      },
    ];

    const summary = computeBankSummary(rows, [
      {
        id: "s",
        fy_label: "FY 2024-25",
        period_from: "2024-04-01",
        period_to: "2024-04-30",
        account_name: "SRI VARALAKSHMI PETROLEUMS",
        account_number: "39441313694",
        opening_balance: 100,
        closing_balance: 120,
      },
    ]);

    expect(summary.cashDeposits).toBe(100);
    expect(summary.ioclPayments).toBe(80);
    expect(summary.totalCredits).toBe(100);
    expect(summary.totalDebits).toBe(80);
    expect(summary.closingBalance).toBe(120);
  });
});
