import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { getPadTransactions } from "@/lib/pad/query-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();
  const transactions = await getPadTransactions(supabase, filters);

  const rows = transactions.map((row) => ({
    id: row.id,
    transaction_date: row.transaction_date,
    category: row.category,
    document_type: row.document_type,
    document_number: row.document_number,
    item_text: row.item_text,
    material_group: row.material_group,
    quantity: row.quantity,
    unit: row.unit,
    debit: row.debit,
    credit: row.credit,
    balance: row.balance,
    plant: row.plant,
  }));

  return NextResponse.json(rows);
}
