import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { getFilteredInvoices } from "@/lib/dashboard/query-helpers";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();
  const invoices = await getFilteredInvoices(supabase, filters);

  const grouped: Record<string, number> = {};
  for (const row of invoices) {
    const date = row.invoice_date || "unknown";
    grouped[date] = (grouped[date] || 0) + (row.invoice_total || 0);
  }

  return NextResponse.json(
    Object.entries(grouped).map(([date, value]) => ({ date, value }))
  );
}
