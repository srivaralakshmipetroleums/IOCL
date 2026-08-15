import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";
import { formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();

  const invoices = await getFilteredInvoices(supabase, filters);
  const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
  const invoiceIds = invoices.map((i) => i.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product);

  const rows = lineItems.map((item) => {
    const invoice = invoiceMap.get(item.invoice_id);
    return {
      id: item.id,
      invoice_date: invoice?.invoice_date ? formatDate(invoice.invoice_date) : "—",
      invoice_date_iso: invoice?.invoice_date || "",
      supplier: invoice?.supplier_name || "—",
      bill_no: invoice?.invoice_number || "—",
      product: item.product || "—",
      invoice_value: item.invoice_value ?? 0,
      hsn_code: item.hsn_code || "—",
      quantity_litres: item.output_quantity ?? 0,
    };
  });

  return NextResponse.json(rows);
}
