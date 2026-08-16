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
  const invoiceIds = invoices.map((i) => i.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product);

  const fuelInvoiceIds = new Set(lineItems.map((item) => item.invoice_id));
  const invoiceCount = fuelInvoiceIds.size;
  const totalValue = lineItems.reduce((sum, item) => sum + (item.invoice_value || 0), 0);
  const totalQuantity = lineItems.reduce((sum, item) => sum + (item.output_quantity || 0), 0);
  const avgPerInvoice = invoiceCount > 0 ? totalValue / invoiceCount : 0;

  return NextResponse.json({
    invoiceCount,
    totalValue,
    totalQuantity,
    lineItemCount: lineItems.length,
    avgPerInvoice,
  });
}
