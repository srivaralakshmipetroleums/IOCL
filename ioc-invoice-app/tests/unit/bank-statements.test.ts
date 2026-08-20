import { describe, expect, it } from "vitest";
import { categorizeBankTransaction } from "@/lib/bank/categorize";
import {
  computeBankSummary,
  computeBankTransferChannelBreakdown,
  computeWalletMissedDays,
  pickBankTransferChannelTotals,
} from "@/lib/bank/metrics";
import { extractTransferPartyName } from "@/lib/bank/transfer-party";
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
    ).toBe("PAYTM");
    expect(
      categorizeBankTransaction(
        "BY TRANSFERNEFT*YESB0000001*YESAP53373553231*PhonePe Limited*-",
        0,
        12000
      )
    ).toBe("PHONEPE");
    expect(
      categorizeBankTransaction(
        "BY TRANSFERNEFT*YESB0000001*YESAP53373154431*ONE 97 COMMUNICATRANSFER",
        0,
        9800
      )
    ).toBe("PAYTM");
    expect(
      categorizeBankTransaction("BULK POSTING-CR_SRI VARALAKSHMI PETROL 022000000294146", 0, 4370)
    ).toBe("CARD_SETTLEMENT");
    expect(
      categorizeBankTransaction(
        "BULK / 16899 POSTING- CR_SRI VARALAKSH MI PETROL 02200000029 4-",
        0,
        500
      )
    ).toBe("CARD_SETTLEMENT");
    expect(
      categorizeBankTransaction(
        "BY TRANSFER-NEFT*ICIC0099999*ICIN209146646270*CREDIT CARD OPER-",
        0,
        430.69
      )
    ).toBe("POS_CARD");
    expect(
      categorizeBankTransaction(
        "BY TRANSFER-IMPS/603248072570/ybp-XX025-PhonePe /F09 Iocls--",
        0,
        33544
      )
    ).toBe("PHONEPE");
    expect(
      categorizeBankTransaction(
        "BY MAB0005574 99922 TRANSFER- 17904 INB MAB0005574 IMPS027606 17904 626769/9999 TRANSFER 999999/XX00 FROM 25/Ioclsrivar- 48980061620 99 /",
        0,
        17904
      )
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
    expect(
      categorizeBankTransaction("BY TRANSFER-RTGS UTR NO: YESBR12026030300006248--", 0, 341126)
    ).toBe("PAYTM");
    expect(
      categorizeBankTransaction(
        "BY TRANSFER-RTGS UTR NO: BARBR52026031800940949--BOGGU NAGARJUNA",
        0,
        200000
      )
    ).toBe("RTGS");
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

  it("flags operating days missing PhonePe, and Paytm only after Paytm appears", () => {
    const base = {
      id: "1",
      statement_id: "s",
      line_number: 1,
      value_date: null,
      reference_no: null,
      branch_code: null,
      debit: 0,
      balance: null,
    };

    const withoutPaytm = computeWalletMissedDays([
      {
        ...base,
        id: "a",
        txn_date: "2024-04-01",
        description: "PHONEPE",
        credit: 100,
        category: "PHONEPE",
      },
      {
        ...base,
        id: "b",
        txn_date: "2024-04-02",
        description: "CASH",
        credit: 50,
        category: "CASH_DEPOSIT",
      },
    ]);
    expect(withoutPaytm).toEqual([
      { date: "2024-04-02", missedPhonePe: true, missedPaytm: false },
    ]);

    const withPaytm = computeWalletMissedDays([
      {
        ...base,
        id: "c",
        txn_date: "2025-11-01",
        description: "PHONEPE",
        credit: 100,
        category: "PHONEPE",
      },
      {
        ...base,
        id: "d",
        txn_date: "2025-11-01",
        description: "PAYTM",
        credit: 40,
        category: "PAYTM",
      },
      {
        ...base,
        id: "e",
        txn_date: "2025-11-02",
        description: "PHONEPE",
        credit: 80,
        category: "PHONEPE",
      },
    ]);
    expect(withPaytm).toEqual([
      { date: "2025-11-02", missedPhonePe: false, missedPaytm: true },
    ]);

    const beforePaytmStart = computeWalletMissedDays([
      {
        ...base,
        id: "f",
        txn_date: "2025-06-01",
        description: "PHONEPE",
        credit: 100,
        category: "PHONEPE",
      },
      {
        ...base,
        id: "g",
        txn_date: "2025-06-02",
        description: "CASH",
        credit: 50,
        category: "CASH_DEPOSIT",
      },
      {
        ...base,
        id: "h",
        txn_date: "2025-07-01",
        description: "PAYTM",
        credit: 40,
        category: "PAYTM",
      },
    ]);
    expect(beforePaytmStart).toEqual([
      { date: "2025-06-02", missedPhonePe: true, missedPaytm: false },
      { date: "2025-07-01", missedPhonePe: true, missedPaytm: false },
    ]);
  });

  it("lists transfer channel totals in fixed order", () => {
    const rows = pickBankTransferChannelTotals([
      {
        category: "RTGS",
        label: "RTGS",
        count: 2,
        debit: 0,
        credit: 500000,
      },
      {
        category: "NEFT",
        label: "NEFT",
        count: 1,
        debit: 1000,
        credit: 0,
      },
    ]);

    expect(rows.map((r) => r.category)).toEqual([
      "NACH_ACH",
      "RTGS",
      "NEFT",
      "IMPS",
      "CHEQUE",
      "OTHER",
      "TRANSFER",
    ]);
    expect(rows.find((r) => r.category === "RTGS")?.credit).toBe(500000);
    expect(rows.find((r) => r.category === "NACH_ACH")?.count).toBe(0);
  });

  it("extracts counterparty labels for transfer channels", () => {
    expect(
      extractTransferPartyName("DEBIT-CMP MANDATE DEBIT Bajaj Finance Ltd. - DD--", "NACH_ACH")
    ).toBe("Bajaj Finance Ltd");
    expect(
      extractTransferPartyName("DEBIT-ACHDr HDFC02165000016647 CHOLAMANDALAM--", "NACH_ACH")
    ).toBe("Cholamandalam");
    expect(
      extractTransferPartyName("DEBIT-ACHDr HDFC00017000001103 HDFC BANK LIMI--", "NACH_ACH")
    ).toBe("HDFC Bank Limited");
    expect(
      extractTransferPartyName(
        "TO TRANSFER- NEFT INB: 99922 INB NEFT UTR NO: CNADPUPUL2 SBIN325149260129- TRANSFER TO TARUNI AGENCIES 4698143044305 / TARUNI AGENCIES",
        "NEFT"
      )
    ).toBe("Taruni Agencies");
    expect(
      extractTransferPartyName(
        "TO TRANSFER-INB Payment to Utility Bills--",
        "TRANSFER",
        "CT0AALNMQ2               TRANSFER TO 39391912489                           GUDAPAREDDY BHASKAR RE /"
      )
    ).toBe("Gudapareddy Bhaskar Reddy");
    expect(
      extractTransferPartyName(
        "TO TRANSFER- CT00QRNOO5 99922 INB Payment to TRANSFER TO Utility Bills- 39391912489 GUDAPAREDDY BHASKAR RE /",
        "TRANSFER"
      )
    ).toBe("Gudapareddy Bhaskar Reddy");
    expect(
      extractTransferPartyName(
        "BY TRANSFER-TRANSFER FROM--",
        "TRANSFER",
        "TRANSFER FROM 32144833656                         Mr. PALLENENI  BHAKTHA /"
      )
    ).toBe("Palleneni Bhaktha");
    expect(
      extractTransferPartyName(
        "BY TRANSFER-RTGS UTR NO: BARBR52026031800940949--BOGGU NAGARJUNA",
        "RTGS"
      )
    ).toBe("BOGGU NAGARJUNA");
  });

  it("groups transfer channels by counterparty", () => {
    const rows: BankTransactionRow[] = [
      {
        id: "1",
        statement_id: "s",
        line_number: 1,
        txn_date: "2026-03-01",
        value_date: null,
        description: "DEBIT-CMP MANDATE DEBIT Bajaj Finance Ltd. - DD--",
        reference_no: null,
        branch_code: null,
        debit: 51076,
        credit: 0,
        balance: null,
        category: "NACH_ACH",
      },
      {
        id: "2",
        statement_id: "s",
        line_number: 2,
        txn_date: "2026-03-02",
        value_date: null,
        description: "DEBIT-ACHDr HDFC02165000016647 CHOLAMANDALAM--",
        reference_no: null,
        branch_code: null,
        debit: 76403,
        credit: 0,
        balance: null,
        category: "NACH_ACH",
      },
      {
        id: "3",
        statement_id: "s",
        line_number: 3,
        txn_date: "2026-03-03",
        value_date: null,
        description: "DEBIT-ACHDr HDFC00017000001103 HDFC BANK LIMI--",
        reference_no: null,
        branch_code: null,
        debit: 34322,
        credit: 0,
        balance: null,
        category: "NACH_ACH",
      },
    ];

    const nach = computeBankTransferChannelBreakdown(rows).find((row) => row.category === "NACH_ACH");
    expect(nach?.count).toBe(3);
    expect(nach?.debit).toBe(161801);
    expect(nach?.parties.map((p) => p.label)).toEqual([
      "Cholamandalam",
      "Bajaj Finance Ltd",
      "HDFC Bank Limited",
    ]);
  });
});
