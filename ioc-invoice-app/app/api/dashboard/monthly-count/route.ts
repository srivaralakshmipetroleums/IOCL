import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getDashboardFilters, listMonthsInPeriod } from "@/lib/dashboard/filters";
import { getFilteredInvoices } from "@/lib/dashboard/query-helpers";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const params = request.nextUrl.searchParams;
  const filters = getDashboardFilters(params);
  const dateFrom = params.get("dateFrom") || filters.dateFrom;
  const dateTo = params.get("dateTo") || filters.dateTo;

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const invoices = await getFilteredInvoices(supabase, filters);

  const grouped: Record<string, number> = {};
  for (const inv of invoices) {
    if (!inv.invoice_date) continue;
    const month = inv.invoice_date.slice(0, 7);
    grouped[month] = (grouped[month] || 0) + 1;
  }

  const monthKeys = listMonthsInPeriod(dateFrom, dateTo, filters.months);
  const result = monthKeys.map((month) => ({
    month,
    count: grouped[month] ?? 0,
  }));

  return NextResponse.json(result);
}
