import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "./filters";
import { DASHBOARD_INVOICE_STATUSES } from "./constants";
import { normalizeFuelProduct } from "./fuel-products";
import { allocateFuelInvoiceValues } from "./fuel-line-values";
import { fetchAllPages, fetchByIdsInChunks } from "@/lib/supabase/fetch-all";

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
  const invoices = await fetchAllPages(async (from, to) => {
    let query = supabase
      .from("invoices")
      .select("id, invoice_date, invoice_total, invoice_number, supplier_name")
      .in("status", [...DASHBOARD_INVOICE_STATUSES])
      .order("invoice_date")
      .order("id")
      .range(from, to);

    if (filters.dateFrom) query = query.gte("invoice_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("invoice_date", filters.dateTo);
    if (filters.supplier) query = query.ilike("supplier_name", `%${filters.supplier}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });

  if (!filters.months?.length) return invoices;

  const allowed = new Set(filters.months);
  return invoices.filter(
    (invoice) => invoice.invoice_date && allowed.has(invoice.invoice_date.slice(0, 7))
  );
}

export async function getFilteredLineItems(
  supabase: SupabaseClient,
  invoiceIds: string[],
  productFilter?: string,
  invoices?: Pick<FilteredInvoice, "id" | "invoice_total">[]
) {
  if (!invoiceIds.length) return [];

  const data = await fetchByIdsInChunks(invoiceIds, (chunk) =>
    fetchAllPages(async (from, to) => {
      const { data, error } = await supabase
        .from("invoice_line_items")
        .select("id, invoice_id, product, output_quantity, invoice_value, hsn_code")
        .in("invoice_id", chunk)
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    })
  );

  const fuelItems = data.filter((item) => {
    const product = normalizeFuelProduct(item.product);
    if (!product) return false;
    if (!productFilter) return true;
    return product === productFilter;
  });
  if (!invoices?.length) return fuelItems;

  const allItems = data.map((item) => ({
    invoice_id: item.invoice_id,
    product: item.product,
    invoice_value: item.invoice_value,
  }));

  const adjustedValues = allocateFuelInvoiceValues(fuelItems, allItems, invoices);

  return fuelItems.map((item) => ({
    ...item,
    invoice_value: adjustedValues.get(item.id) ?? item.invoice_value,
  }));
}
