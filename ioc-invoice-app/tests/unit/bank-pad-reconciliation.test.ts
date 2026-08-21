import { describe, expect, it } from "vitest";
import {
  normalizeBankPadUtr,
  reconcileBankPadIocl,
  summarizeBankPadReconciliation,
} from "@/lib/bank/reconcile-pad-iocl";
import { computeBankReportSummary } from "@/lib/bank/report-metrics";
import type { BankExecutiveSummary } from "@/lib/bank/metrics";

describe("bank PAD IOCL reconciliation", () => {
  it("normalizes bank and PAD UTR formats", () => {
    expect(normalizeBankPadUtr("TO TRANSFER-INB RTGS UTR NO: SBINR12026031019582543--IOCL")).toBe(
      "26031019582543"
    );
    expect(normalizeBankPadUtr("SBIN26031019582543 SBIN0002766_39441313694")).toBe("26031019582543");
    expect(
      normalizeBankPadUtr("CHQ TRANSFER-RTGS UTR NO: SBINR52026031019582543--597851 IOCL")
    ).toBe("26031019582543");
  });

  it("normalizes FY25 bank UTR with century prefix to match PAD format", () => {
    expect(
      normalizeBankPadUtr(
        "TO TRANSFER-INB RTGS UTR NO: CRH4837905 SBINR12025040280866401 TRANSFER TO IOCL"
      )
    ).toBe("25040280866401");
    expect(normalizeBankPadUtr("SBIN25040280866401 SBIN0002766_39441313694")).toBe(
      "25040280866401"
    );
  });

  it("matches bank and PAD rows when UTR formats differ but core digits align", () => {
    const rows = reconcileBankPadIocl(
      [
        {
          date: "2025-04-02",
          amount: 900000,
          utr: normalizeBankPadUtr("SBINR12025040280866401"),
          description: "TO TRANSFER-INB RTGS",
        },
      ],
      [
        {
          date: "2025-04-02",
          amount: 900000,
          utr: normalizeBankPadUtr("SBIN25040280866401 SBIN0002766"),
          itemText: "SBIN25040280866401 SBIN0002766_39441313694",
        },
      ]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("MATCHED");
  });

  it("matches by date and amount when bank UTR is truncated in narration", () => {
    const rows = reconcileBankPadIocl(
      [
        {
          date: "2025-04-02",
          amount: 900000,
          utr: normalizeBankPadUtr("SBINR12025040280"),
          description: "TO TRANSFER-INB RTGS UTR NO: SBINR12025040280",
        },
      ],
      [
        {
          date: "2025-04-02",
          amount: 900000,
          utr: normalizeBankPadUtr("SBIN25040280866401"),
          itemText: "SBIN25040280866401",
        },
      ]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("MATCHED");
  });

  it("matches rows by UTR and flags amount mismatch for bundled bank charges", () => {
    const rows = reconcileBankPadIocl(
      [
        {
          date: "2026-03-10",
          amount: 600047.2,
          utr: "26031019582543",
          description: "CHQ TRANSFER-RTGS",
        },
      ],
      [
        {
          date: "2026-03-10",
          amount: 600000,
          utr: "26031019582543",
          itemText: "SBIN26031019582543",
        },
      ]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("AMOUNT_MISMATCH");
    expect(rows[0].difference).toBeCloseTo(47.2);
    expect(rows[0].note).toContain("47.20");
  });

  it("summarizes reconciliation counts", () => {
    const rows = reconcileBankPadIocl(
      [{ date: "2026-03-01", amount: 100, utr: "a", description: "bank" }],
      [{ date: "2026-03-02", amount: 200, utr: "b", itemText: "pad" }]
    );
    const summary = summarizeBankPadReconciliation(rows, 100, 200);
    expect(summary.bankOnly).toBe(1);
    expect(summary.padOnly).toBe(1);
  });
});

describe("bank report summary", () => {
  it("computes total collections and net operating cash", () => {
    const base: BankExecutiveSummary = {
      openingBalance: 0,
      closingBalance: 0,
      totalCredits: 1000,
      totalDebits: 800,
      netMovement: 200,
      cashDeposits: 100,
      phonePe: 200,
      paytm: 50,
      cardSettlements: 0,
      posCards: 0,
      upiIn: 50,
      ioclPayments: 500,
      bankCharges: 20,
      salary: 30,
      transactionCount: 5,
    };

    const summary = computeBankReportSummary(
      [
        {
          id: "1",
          statement_id: "s",
          line_number: 1,
          txn_date: "2026-03-01",
          value_date: null,
          description: "IOCL credit",
          reference_no: null,
          branch_code: null,
          debit: 0,
          credit: 25,
          balance: null,
          category: "IOCL_CREDIT",
        },
      ],
      base,
      2
    );

    expect(summary.totalCollections).toBe(425);
    expect(summary.netOperatingCash).toBe(-125);
    expect(summary.missedWalletDays).toBe(2);
  });
});
