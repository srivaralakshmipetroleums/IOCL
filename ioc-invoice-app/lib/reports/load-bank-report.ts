import { createServiceClient } from "@/lib/supabase/server";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import { loadBankDashboardData } from "@/lib/bank/load-dashboard";
import {
  computeBankOutflowPeriodTotals,
  computeBankReportCashFlowByMonth,
  computeBankReportSummary,
  type BankReportCashFlowMonth,
  type BankReportSummary,
} from "@/lib/bank/report-metrics";
import {
  bankRowsForPadReconciliation,
  padRowsForBankReconciliation,
  reconcileBankPadIocl,
  summarizeBankPadReconciliation,
  type BankPadReconciliationRow,
  type BankPadReconciliationSummary,
} from "@/lib/bank/reconcile-pad-iocl";
import { getPadTransactions } from "@/lib/pad/query-helpers";
import type {
  BankCashFlowMonth,
  BankCategoryTotal,
  BankTransferChannelBreakdown,
  WalletMissedDay,
} from "@/lib/bank/metrics";
import type { BankTransactionRow } from "@/lib/bank/types";

export interface BankReportPeriod {
  dateFrom: string;
  dateTo: string;
  label: string;
  months?: string[];
}

export interface BankStatementMeta {
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
  fyLabels: string[];
}

export interface BankReportDataset {
  period: BankReportPeriod;
  generatedAt: string;
  account: BankStatementMeta;
  summary: BankReportSummary;
  cashFlow: BankReportCashFlowMonth[];
  transactions: BankTransactionRow[];
  categories: BankCategoryTotal[];
  transferChannels: BankTransferChannelBreakdown[];
  walletMissedDays: WalletMissedDay[];
  reconciliation: BankPadReconciliationRow[];
  reconciliationSummary: BankPadReconciliationSummary;
  outflowByMonth: ReturnType<typeof computeBankOutflowPeriodTotals>;
  outflowByYear: ReturnType<typeof computeBankOutflowPeriodTotals>;
}

async function getBankStatementMeta(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  filters: DashboardFilters
): Promise<BankStatementMeta> {
  let query = supabase
    .from("bank_statements")
    .select("account_name, account_number, ifsc, branch, fy_label")
    .order("period_from", { ascending: true });

  if (filters.dateFrom) query = query.gte("period_to", filters.dateFrom);
  if (filters.dateTo) query = query.lte("period_from", filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const first = rows[0];
  const fyLabels = [...new Set(rows.map((row) => String(row.fy_label)))];

  return {
    accountName: (first?.account_name as string) ?? "SRI VARALAKSHMI PETROLEUMS",
    accountNumber: first?.account_number ? String(first.account_number) : null,
    ifsc: (first?.ifsc as string) ?? null,
    branch: (first?.branch as string) ?? null,
    fyLabels,
  };
}

export async function loadBankReportDataset(period: BankReportPeriod): Promise<BankReportDataset> {
  const filters: DashboardFilters = {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    months: period.months,
  };

  const supabase = await createServiceClient();
  const [dashboard, account, padTransactions] = await Promise.all([
    loadBankDashboardData(supabase, filters),
    getBankStatementMeta(supabase, filters),
    getPadTransactions(supabase, filters),
  ]);

  const summary = computeBankReportSummary(
    dashboard.transactions,
    dashboard.summary,
    dashboard.walletMissedDays.length
  );
  const cashFlow = computeBankReportCashFlowByMonth(
    dashboard.transactions,
    dashboard.cashFlow as BankCashFlowMonth[]
  );

  const bankMatchRows = bankRowsForPadReconciliation(dashboard.transactions);
  const padMatchRows = padRowsForBankReconciliation(padTransactions);
  const reconciliation = reconcileBankPadIocl(bankMatchRows, padMatchRows);
  const bankTotal = bankMatchRows.reduce((sum, row) => sum + row.amount, 0);
  const padTotal = padMatchRows.reduce((sum, row) => sum + row.amount, 0);

  return {
    period,
    generatedAt: new Date().toISOString(),
    account,
    summary,
    cashFlow,
    transactions: dashboard.transactions,
    categories: dashboard.categories,
    transferChannels: dashboard.transferChannels,
    walletMissedDays: dashboard.walletMissedDays,
    reconciliation,
    reconciliationSummary: summarizeBankPadReconciliation(reconciliation, bankTotal, padTotal),
    outflowByMonth: computeBankOutflowPeriodTotals(dashboard.transactions, "month"),
    outflowByYear: computeBankOutflowPeriodTotals(dashboard.transactions, "year"),
  };
}
