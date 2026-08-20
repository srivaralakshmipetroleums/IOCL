import type { SupabaseClient } from "@supabase/supabase-js";
import { fillMonthsInPeriod, type DashboardFilters } from "@/lib/dashboard/filters";
import {
  computeBankBalanceTrend,
  computeBankCashFlowByMonth,
  computeBankCategoryTotals,
  computeBankSummary,
  type BankCashFlowMonth,
} from "@/lib/bank/metrics";
import { getBankStatements, getBankTransactions } from "@/lib/bank/query-helpers";

function emptyCashFlow(month: string): BankCashFlowMonth {
  return {
    month,
    creditsIn: 0,
    debitsOut: 0,
    cashDeposits: 0,
    digitalCollections: 0,
    ioclPayments: 0,
    charges: 0,
  };
}

export async function loadBankDashboardData(
  supabase: SupabaseClient,
  filters: DashboardFilters
) {
  const [transactions, statements] = await Promise.all([
    getBankTransactions(supabase, filters),
    getBankStatements(supabase, filters),
  ]);

  return {
    transactions,
    statements,
    summary: computeBankSummary(transactions, statements),
    balanceTrend: computeBankBalanceTrend(transactions),
    cashFlow: fillMonthsInPeriod(
      computeBankCashFlowByMonth(transactions),
      filters.dateFrom,
      filters.dateTo,
      filters.months,
      emptyCashFlow
    ),
    categories: computeBankCategoryTotals(transactions),
  };
}
