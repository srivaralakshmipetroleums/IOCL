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
  for (const inv of invoices) {
    if (!inv.invoice_date) continue;
    const month = inv.invoice_date.slice(0, 7);
    grouped[month] = (grouped[month] || 0) + 1;
  }

  return NextResponse.json(
    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))
  );
}
