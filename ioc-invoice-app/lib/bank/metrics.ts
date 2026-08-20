import { BANK_CATEGORY_LABELS, type BankTransactionCategory } from "@/lib/bank/categorize";
import { monthKey } from "@/lib/bank/query-helpers";
import type { BankStatementRow, BankTransactionRow } from "@/lib/bank/types";

export interface BankExecutiveSummary {
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  netMovement: number;
  cashDeposits: number;
  phonePe: number;
  cardSettlements: number;
  posCards: number;
  upiIn: number;
  ioclPayments: number;
  bankCharges: number;
  salary: number;
  transactionCount: number;
}

export interface BankBalancePoint {
  date: string;
  balance: number;
}

export interface BankCashFlowMonth {
  month: string;
  creditsIn: number;
  debitsOut: number;
  cashDeposits: number;
  digitalCollections: number;
  ioclPayments: number;
  charges: number;
}

export interface BankCategoryTotal {
  category: BankTransactionCategory;
  label: string;
  count: number;
  debit: number;
  credit: number;
}

function sumBy(
  rows: BankTransactionRow[],
  category: BankTransactionCategory,
  field: "debit" | "credit"
): number {
  return rows
    .filter((row) => row.category === category)
    .reduce((sum, row) => sum + row[field], 0);
}

export function computeBankSummary(
  transactions: BankTransactionRow[],
  statements: BankStatementRow[]
): BankExecutiveSummary {
  const totalCredits = transactions.reduce((sum, row) => sum + row.credit, 0);
  const totalDebits = transactions.reduce((sum, row) => sum + row.debit, 0);
  const sortedStatements = [...statements].sort((a, b) =>
    a.period_from.localeCompare(b.period_from)
  );
  const openingBalance = sortedStatements[0]?.opening_balance ?? 0;
  const lastTxnWithBal = [...transactions].reverse().find((row) => row.balance != null);
  const closingBalance =
    lastTxnWithBal?.balance ??
    sortedStatements[sortedStatements.length - 1]?.closing_balance ??
    openingBalance + totalCredits - totalDebits;

  return {
    openingBalance,
    closingBalance,
    totalCredits,
    totalDebits,
    netMovement: totalCredits - totalDebits,
    cashDeposits: sumBy(transactions, "CASH_DEPOSIT", "credit"),
    phonePe: sumBy(transactions, "PHONEPE", "credit"),
    cardSettlements: sumBy(transactions, "CARD_SETTLEMENT", "credit"),
    posCards: sumBy(transactions, "POS_CARD", "credit"),
    upiIn: sumBy(transactions, "UPI_CREDIT", "credit"),
    ioclPayments: sumBy(transactions, "IOCL_PAYMENT", "debit"),
    bankCharges: sumBy(transactions, "BANK_CHARGE", "debit"),
    salary: sumBy(transactions, "SALARY", "debit"),
    transactionCount: transactions.length,
  };
}

export function computeBankBalanceTrend(transactions: BankTransactionRow[]): BankBalancePoint[] {
  const byDate = new Map<string, number>();
  for (const row of transactions) {
    if (row.balance == null) continue;
    byDate.set(row.txn_date, row.balance);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, balance]) => ({ date, balance }));
}

export function computeBankCashFlowByMonth(transactions: BankTransactionRow[]): BankCashFlowMonth[] {
  const byMonth = new Map<string, BankCashFlowMonth>();
  for (const row of transactions) {
    const month = monthKey(row.txn_date);
    if (!month) continue;
    const current = byMonth.get(month) ?? {
      month,
      creditsIn: 0,
      debitsOut: 0,
      cashDeposits: 0,
      digitalCollections: 0,
      ioclPayments: 0,
      charges: 0,
    };
    current.creditsIn += row.credit;
    current.debitsOut += row.debit;
    if (row.category === "CASH_DEPOSIT") current.cashDeposits += row.credit;
    if (
      row.category === "PHONEPE" ||
      row.category === "CARD_SETTLEMENT" ||
      row.category === "POS_CARD" ||
      row.category === "UPI_CREDIT"
    ) {
      current.digitalCollections += row.credit;
    }
    if (row.category === "IOCL_PAYMENT") current.ioclPayments += row.debit;
    if (row.category === "BANK_CHARGE") current.charges += row.debit;
    byMonth.set(month, current);
  }
  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function computeBankCategoryTotals(transactions: BankTransactionRow[]): BankCategoryTotal[] {
  const byCategory = new Map<BankTransactionCategory, BankCategoryTotal>();
  for (const row of transactions) {
    const current = byCategory.get(row.category) ?? {
      category: row.category,
      label: BANK_CATEGORY_LABELS[row.category],
      count: 0,
      debit: 0,
      credit: 0,
    };
    current.count += 1;
    current.debit += row.debit;
    current.credit += row.credit;
    byCategory.set(row.category, current);
  }
  return [...byCategory.values()].sort((a, b) => b.debit + b.credit - (a.debit + a.credit));
}
