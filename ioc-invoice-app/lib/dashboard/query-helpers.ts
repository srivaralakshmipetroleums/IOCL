import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "./filters";
import { DASHBOARD_INVOICE_STATUSES } from "./constants";
import { normalizeFuelProduct } from "./fuel-products";
import { allocateFuelInvoiceValues } from "./fuel-line-values";

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
    .in("status", [...DASHBOARD_INVOICE_STATUSES]);

  if (filters.dateFrom) query = query.gte("invoice_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("invoice_date", filters.dateTo);
  if (filters.supplier) query = query.ilike("supplier_name", `%${filters.supplier}%`);

  const { data } = await query.order("invoice_date");
  let invoices = data || [];

  if (filters.months?.length) {
    const allowed = new Set(filters.months);
    invoices = invoices.filter(
      (invoice) => invoice.invoice_date && allowed.has(invoice.invoice_date.slice(0, 7))
    );
  }

  return invoices;
}

export async function getFilteredLineItems(
  supabase: SupabaseClient,
  invoiceIds: string[],
  productFilter?: string,
  invoices?: Pick<FilteredInvoice, "id" | "invoice_total">[]
) {
  if (!invoiceIds.length) return [];

  const query = supabase
    .from("invoice_line_items")
    .select("id, invoice_id, product, output_quantity, invoice_value, hsn_code")
    .in("invoice_id", invoiceIds);

  const { data } = await query;
  const fuelItems = (data || []).filter((item) => {
    const product = normalizeFuelProduct(item.product);
    if (!product) return false;
    if (!productFilter) return true;
    return product === productFilter;
  });
  if (!invoices?.length) return fuelItems;

  const { data: allItems } = await supabase
    .from("invoice_line_items")
    .select("invoice_id, product, invoice_value")
    .in("invoice_id", invoiceIds);

  const adjustedValues = allocateFuelInvoiceValues(
    fuelItems,
    allItems || [],
    invoices
  );

  return fuelItems.map((item) => ({
    ...item,
    invoice_value: adjustedValues.get(item.id) ?? item.invoice_value,
  }));
}
