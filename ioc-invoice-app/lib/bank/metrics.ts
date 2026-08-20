import { BANK_CATEGORY_LABELS, type BankTransactionCategory } from "@/lib/bank/categorize";
import {
  extractTransferPartyName,
  normalizeTransferPartyKey,
} from "@/lib/bank/transfer-party";
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
  paytm: number;
  cardSettlements: number;
  posCards: number;
  upiIn: number;
  ioclPayments: number;
  bankCharges: number;
  salary: number;
  transactionCount: number;
}

export interface WalletCreditPoint {
  period: string;
  phonePe: number;
  paytm: number;
}

export interface WalletMissedDay {
  date: string;
  missedPhonePe: boolean;
  missedPaytm: boolean;
}

export type WalletCreditGrain = "day" | "month";

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

/** NACH/ACH, RTGS, NEFT, IMPS, cheque, other, and other transfers — period summary table. */
export const BANK_TRANSFER_CHANNEL_CATEGORIES: readonly BankTransactionCategory[] = [
  "NACH_ACH",
  "RTGS",
  "NEFT",
  "IMPS",
  "CHEQUE",
  "OTHER",
  "TRANSFER",
];

export interface BankTransferPartyTotal {
  label: string;
  count: number;
  debit: number;
  credit: number;
}

export interface BankTransferChannelBreakdown {
  category: BankTransactionCategory;
  label: string;
  count: number;
  debit: number;
  credit: number;
  parties: BankTransferPartyTotal[];
}

export function pickBankTransferChannelTotals(categories: BankCategoryTotal[]): BankCategoryTotal[] {
  const byCategory = new Map(categories.map((row) => [row.category, row]));
  return BANK_TRANSFER_CHANNEL_CATEGORIES.map((category) => {
    const row = byCategory.get(category);
    return row ?? {
      category,
      label: BANK_CATEGORY_LABELS[category],
      count: 0,
      debit: 0,
      credit: 0,
    };
  });
}

export function computeBankTransferChannelBreakdown(
  transactions: BankTransactionRow[]
): BankTransferChannelBreakdown[] {
  const partyMaps = new Map<BankTransactionCategory, Map<string, BankTransferPartyTotal>>();

  for (const row of transactions) {
    if (!BANK_TRANSFER_CHANNEL_CATEGORIES.includes(row.category)) continue;

    const label = extractTransferPartyName(row.description, row.category, row.reference_no);
    const key = normalizeTransferPartyKey(label);
    const parties = partyMaps.get(row.category) ?? new Map<string, BankTransferPartyTotal>();
    const current = parties.get(key) ?? { label, count: 0, debit: 0, credit: 0 };
    current.count += 1;
    current.debit += row.debit;
    current.credit += row.credit;
    parties.set(key, current);
    partyMaps.set(row.category, parties);
  }

  return BANK_TRANSFER_CHANNEL_CATEGORIES.map((category) => {
    const parties = [...(partyMaps.get(category)?.values() ?? [])].sort(
      (a, b) => b.debit + b.credit - (a.debit + a.credit)
    );
    const count = parties.reduce((sum, party) => sum + party.count, 0);
    const debit = parties.reduce((sum, party) => sum + party.debit, 0);
    const credit = parties.reduce((sum, party) => sum + party.credit, 0);
    return {
      category,
      label: BANK_CATEGORY_LABELS[category],
      count,
      debit,
      credit,
      parties,
    };
  });
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
    paytm: sumBy(transactions, "PAYTM", "credit"),
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
      row.category === "PAYTM" ||
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

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function listIsoDays(dateFrom: string, dateTo: string): string[] {
  const days: string[] = [];
  let cursor = dateFrom;
  while (cursor <= dateTo) {
    days.push(cursor);
    const [year, month, day] = cursor.split("-").map(Number);
    const next = new Date(year, month - 1, day + 1);
    cursor = `${next.getFullYear()}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}`;
  }
  return days;
}

export function walletCreditGrain(dateFrom?: string, dateTo?: string): WalletCreditGrain {
  if (!dateFrom || !dateTo) return "month";
  return listIsoDays(dateFrom, dateTo).length <= 62 ? "day" : "month";
}

export function computeWalletCreditSeries(
  transactions: BankTransactionRow[],
  grain: WalletCreditGrain
): WalletCreditPoint[] {
  const byPeriod = new Map<string, WalletCreditPoint>();
  for (const row of transactions) {
    const period = grain === "month" ? monthKey(row.txn_date) : row.txn_date;
    if (!period) continue;
    const current = byPeriod.get(period) ?? { period, phonePe: 0, paytm: 0 };
    if (row.category === "PHONEPE") current.phonePe += row.credit;
    if (row.category === "PAYTM") current.paytm += row.credit;
    byPeriod.set(period, current);
  }
  return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export function fillWalletCreditSeries(
  rows: WalletCreditPoint[],
  grain: WalletCreditGrain,
  dateFrom?: string,
  dateTo?: string
): WalletCreditPoint[] {
  if (!dateFrom || !dateTo) {
    return [...rows].sort((a, b) => a.period.localeCompare(b.period));
  }
  const byPeriod = new Map(rows.map((row) => [row.period, row]));
  const periods = grain === "month" ? listMonthsForWallet(dateFrom, dateTo) : listIsoDays(dateFrom, dateTo);
  return periods.map((period) => byPeriod.get(period) ?? { period, phonePe: 0, paytm: 0 });
}

function listMonthsForWallet(dateFrom: string, dateTo: string): string[] {
  const months: string[] = [];
  const [startYear, startMonth] = dateFrom.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = dateTo.slice(0, 7).split("-").map(Number);
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${pad2(month)}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** Regular Paytm settlements in imported statements begin on this date. */
export const PAYTM_SETTLEMENT_START_DATE = "2025-06-25";

/** Operating days (any credit) missing PhonePe and/or Paytm. Paytm gaps only from PAYTM_SETTLEMENT_START_DATE. */
export function computeWalletMissedDays(transactions: BankTransactionRow[]): WalletMissedDay[] {
  const byDate = new Map<string, { credits: number; phonePe: number; paytm: number }>();
  for (const row of transactions) {
    const current = byDate.get(row.txn_date) ?? { credits: 0, phonePe: 0, paytm: 0 };
    current.credits += row.credit;
    if (row.category === "PHONEPE") current.phonePe += row.credit;
    if (row.category === "PAYTM") current.paytm += row.credit;
    byDate.set(row.txn_date, current);
  }

  const paytmInPeriod = transactions.some(
    (row) =>
      row.category === "PAYTM" &&
      row.credit > 0 &&
      row.txn_date >= PAYTM_SETTLEMENT_START_DATE
  );
  const missed: WalletMissedDay[] = [];
  for (const [date, row] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (row.credits <= 0) continue;
    const missedPhonePe = row.phonePe <= 0;
    const missedPaytm =
      date >= PAYTM_SETTLEMENT_START_DATE && paytmInPeriod && row.paytm <= 0;
    if (missedPhonePe || missedPaytm) {
      missed.push({ date, missedPhonePe, missedPaytm });
    }
  }
  return missed;
}
