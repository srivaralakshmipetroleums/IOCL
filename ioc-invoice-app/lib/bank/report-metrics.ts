import type { BankTransactionCategory } from "@/lib/bank/categorize";
import { monthKey } from "@/lib/bank/query-helpers";
import type { BankExecutiveSummary, BankCashFlowMonth } from "@/lib/bank/metrics";
import type { BankTransactionRow } from "@/lib/bank/types";
import { roundMoney } from "@/lib/dashboard/format";

const COLLECTION_CATEGORIES = new Set<BankTransactionCategory>([
  "CASH_DEPOSIT",
  "PHONEPE",
  "PAYTM",
  "CARD_SETTLEMENT",
  "POS_CARD",
  "UPI_CREDIT",
  "IOCL_CREDIT",
  "INTEREST",
]);

export interface BankReportSummary extends BankExecutiveSummary {
  ioclCredits: number;
  totalCollections: number;
  digitalCollections: number;
  netOperatingCash: number;
  missedWalletDays: number;
}

export interface BankReportCashFlowMonth extends BankCashFlowMonth {
  phonePe: number;
  paytm: number;
  cardSettlements: number;
  posCards: number;
  upiIn: number;
  salary: number;
  netMovement: number;
  closingBalance: number | null;
}

function sumCategory(
  transactions: BankTransactionRow[],
  category: BankTransactionCategory,
  field: "debit" | "credit"
): number {
  return transactions
    .filter((row) => row.category === category)
    .reduce((sum, row) => sum + row[field], 0);
}

export function computeBankReportSummary(
  transactions: BankTransactionRow[],
  summary: BankExecutiveSummary,
  missedWalletDays: number
): BankReportSummary {
  const ioclCredits = sumCategory(transactions, "IOCL_CREDIT", "credit");
  const totalCollections = roundMoney(
    summary.cashDeposits +
      summary.phonePe +
      summary.paytm +
      summary.cardSettlements +
      summary.posCards +
      summary.upiIn +
      ioclCredits +
      sumCategory(transactions, "INTEREST", "credit")
  );
  const digitalCollections = roundMoney(
    summary.phonePe +
      summary.paytm +
      summary.cardSettlements +
      summary.posCards +
      summary.upiIn
  );
  const netOperatingCash = roundMoney(
    totalCollections - summary.ioclPayments - summary.salary - summary.bankCharges
  );

  return {
    ...summary,
    ioclCredits,
    totalCollections,
    digitalCollections,
    netOperatingCash,
    missedWalletDays,
  };
}

export function computeBankReportCashFlowByMonth(
  transactions: BankTransactionRow[],
  baseCashFlow: BankCashFlowMonth[]
): BankReportCashFlowMonth[] {
  const extras = new Map<
    string,
    {
      phonePe: number;
      paytm: number;
      cardSettlements: number;
      posCards: number;
      upiIn: number;
      salary: number;
      closingBalance: number | null;
    }
  >();

  for (const row of transactions) {
    const month = monthKey(row.txn_date);
    if (!month) continue;
    const entry = extras.get(month) ?? {
      phonePe: 0,
      paytm: 0,
      cardSettlements: 0,
      posCards: 0,
      upiIn: 0,
      salary: 0,
      closingBalance: null,
    };
    if (row.category === "PHONEPE") entry.phonePe += row.credit;
    if (row.category === "PAYTM") entry.paytm += row.credit;
    if (row.category === "CARD_SETTLEMENT") entry.cardSettlements += row.credit;
    if (row.category === "POS_CARD") entry.posCards += row.credit;
    if (row.category === "UPI_CREDIT") entry.upiIn += row.credit;
    if (row.category === "SALARY") entry.salary += row.debit;
    if (row.balance != null) entry.closingBalance = row.balance;
    extras.set(month, entry);
  }

  return baseCashFlow.map((row) => {
    const extra = extras.get(row.month);
    return {
      ...row,
      phonePe: extra?.phonePe ?? 0,
      paytm: extra?.paytm ?? 0,
      cardSettlements: extra?.cardSettlements ?? 0,
      posCards: extra?.posCards ?? 0,
      upiIn: extra?.upiIn ?? 0,
      salary: extra?.salary ?? 0,
      netMovement: row.creditsIn - row.debitsOut,
      closingBalance: extra?.closingBalance ?? null,
    };
  });
}

export function isCollectionCategory(category: BankTransactionCategory): boolean {
  return COLLECTION_CATEGORIES.has(category);
}

export interface BankOutflowPeriodTotal {
  period: string;
  bankCharges: number;
  salary: number;
  ioclPayments: number;
  total: number;
}

export function computeBankOutflowPeriodTotals(
  transactions: BankTransactionRow[],
  grain: "month" | "year"
): BankOutflowPeriodTotal[] {
  const map = new Map<string, BankOutflowPeriodTotal>();

  for (const row of transactions) {
    const period =
      grain === "month" ? monthKey(row.txn_date) : row.txn_date?.slice(0, 4);
    if (!period) continue;

    const entry = map.get(period) ?? {
      period,
      bankCharges: 0,
      salary: 0,
      ioclPayments: 0,
      total: 0,
    };

    if (row.category === "BANK_CHARGE") entry.bankCharges += row.debit;
    if (row.category === "SALARY") entry.salary += row.debit;
    if (row.category === "IOCL_PAYMENT") entry.ioclPayments += row.debit;
    entry.total = entry.bankCharges + entry.salary + entry.ioclPayments;
    map.set(period, entry);
  }

  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}
