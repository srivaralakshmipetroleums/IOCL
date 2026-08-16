import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();

  const invoices = await getFilteredInvoices(supabase, filters);
  const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoice_date]));
  const invoiceIds = invoices.map((i) => i.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product, invoices);

  const grouped: Record<string, number> = {};
  for (const item of lineItems) {
    const date = invoiceMap.get(item.invoice_id);
    if (!date || date === "unknown") continue;

    grouped[date] = (grouped[date] || 0) + (item.output_quantity || 0);
  }

  return NextResponse.json(
    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, quantity]) => ({ date, quantity }))
  );
}
