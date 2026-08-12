import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

function getFilters(params: URLSearchParams) {
  return {
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    supplier: params.get("supplier") || undefined,
    product: params.get("product") || undefined,
  };
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();

  let invoiceQuery = supabase
    .from("invoices")
    .select("id, invoice_total, invoice_date, status")
    .eq("status", "APPROVED");

  if (filters.dateFrom) invoiceQuery = invoiceQuery.gte("invoice_date", filters.dateFrom);
  if (filters.dateTo) invoiceQuery = invoiceQuery.lte("invoice_date", filters.dateTo);
  if (filters.supplier) invoiceQuery = invoiceQuery.ilike("supplier_name", `%${filters.supplier}%`);

  const { data: invoices } = await invoiceQuery;

  const invoiceIds = (invoices || []).map((i) => i.id);

  let lineItemQuery = supabase
    .from("invoice_line_items")
    .select("output_quantity, product, invoice_value")
    .in("invoice_id", invoiceIds.length ? invoiceIds : ["00000000-0000-0000-0000-000000000000"]);

  if (filters.product) lineItemQuery = lineItemQuery.ilike("product", `%${filters.product}%`);

  const { data: lineItems } = await lineItemQuery;

  const totalValue = (invoices || []).reduce((sum, i) => sum + (i.invoice_total || 0), 0);
  const totalQuantity = (lineItems || []).reduce((sum, i) => sum + (i.output_quantity || 0), 0);

  return NextResponse.json({
    invoiceCount: invoices?.length || 0,
    totalValue,
    totalQuantity,
    lineItemCount: lineItems?.length || 0,
  });
}
