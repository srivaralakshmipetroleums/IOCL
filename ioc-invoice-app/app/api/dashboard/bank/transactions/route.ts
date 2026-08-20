import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getBankTransactions } from "@/lib/bank/query-helpers";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();
  const transactions = await getBankTransactions(supabase, filters);

  return NextResponse.json(
    transactions.map((row) => ({
      id: row.id,
      txn_date: row.txn_date,
      category: row.category,
      description: row.description,
      reference_no: row.reference_no,
      branch_code: row.branch_code,
      debit: row.debit,
      credit: row.credit,
      balance: row.balance,
    }))
  );
}
