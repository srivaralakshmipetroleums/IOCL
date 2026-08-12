import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "./filters";

export interface FilteredInvoice {
  id: string;
  invoice_date: string | null;
  invoice_total: number | null;
  invoice_number: string | null;
  supplier_name: string | null;
}

export async function getFilteredInvoices(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<FilteredInvoice[]> {
  let query = supabase
    .from("invoices")
    .select("id, invoice_date, invoice_total, invoice_number, supplier_name")
    .eq("status", "APPROVED");

  if (filters.dateFrom) query = query.gte("invoice_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("invoice_date", filters.dateTo);
  if (filters.supplier) query = query.ilike("supplier_name", `%${filters.supplier}%`);

  const { data } = await query.order("invoice_date");
  return data || [];
}

export async function getFilteredLineItems(
  supabase: SupabaseClient,
  invoiceIds: string[],
  productFilter?: string
) {
  if (!invoiceIds.length) return [];

  let query = supabase
    .from("invoice_line_items")
    .select("id, invoice_id, product, output_quantity, invoice_value, hsn_code")
    .in("invoice_id", invoiceIds);

  if (productFilter) query = query.ilike("product", `%${productFilter}%`);

  const { data } = await query;
  return data || [];
}
