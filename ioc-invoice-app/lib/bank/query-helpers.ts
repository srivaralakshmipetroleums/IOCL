import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import type { BankStatementRow, BankTransactionRow } from "@/lib/bank/types";
import { fetchAllPages } from "@/lib/supabase/fetch-all";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapTransaction(row: Record<string, unknown>): BankTransactionRow {
  return {
    id: String(row.id),
    statement_id: String(row.statement_id),
    line_number: Number(row.line_number),
    txn_date: String(row.txn_date),
    value_date: (row.value_date as string) ?? null,
    description: String(row.description ?? ""),
    reference_no: (row.reference_no as string) ?? null,
    branch_code: (row.branch_code as string) ?? null,
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    balance: row.balance != null ? Number(row.balance) : null,
    category: row.category as BankTransactionRow["category"],
  };
}

export function monthKey(date: string | null): string | null {
  if (!date) return null;
  return date.slice(0, 7);
}

export async function getBankTransactions(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<BankTransactionRow[]> {
  const data = await fetchAllPages(async (from, to) => {
    let query = supabase
      .from("bank_transactions")
      .select("*")
      .order("txn_date", { ascending: true })
      .order("line_number", { ascending: true })
      .range(from, to);

    if (filters.dateFrom) query = query.gte("txn_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("txn_date", filters.dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });

  let rows = data.map(mapTransaction);
  if (filters.months?.length) {
    const allowed = new Set(filters.months);
    rows = rows.filter((row) => {
      const key = monthKey(row.txn_date);
      return key ? allowed.has(key) : false;
    });
  }
  return rows;
}

export async function getBankStatements(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<BankStatementRow[]> {
  let query = supabase
    .from("bank_statements")
    .select(
      "id, fy_label, period_from, period_to, account_name, account_number, opening_balance, closing_balance"
    )
    .order("period_from", { ascending: true });

  if (filters.dateFrom) query = query.gte("period_to", filters.dateFrom);
  if (filters.dateTo) query = query.lte("period_from", filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    fy_label: String(row.fy_label),
    period_from: String(row.period_from),
    period_to: String(row.period_to),
    account_name: (row.account_name as string) ?? null,
    account_number: String(row.account_number),
    opening_balance: row.opening_balance != null ? Number(row.opening_balance) : null,
    closing_balance: row.closing_balance != null ? Number(row.closing_balance) : null,
  }));
}
