import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeFuelProduct, FUEL_PRODUCTS } from "@/lib/dashboard/fuel-products";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();

  const invoices = await getFilteredInvoices(supabase, filters);
  const invoiceIds = invoices.map((i) => i.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product);

  const grouped: Record<string, number> = {};
  for (const item of lineItems) {
    const product = normalizeFuelProduct(item.product);
    if (!product) continue;
    grouped[product] = (grouped[product] || 0) + (item.output_quantity || 0);
  }

  return NextResponse.json(
    FUEL_PRODUCTS.map((product) => ({
      product,
      quantity: grouped[product] || 0,
    })).filter((entry) => entry.quantity > 0)
  );
}
