import { isFuelProduct } from "./fuel-products";

interface LineItemValueRow {
  id: string;
  invoice_id: string;
  product: string | null;
  invoice_value: number | null;
}

interface InvoiceTotalRow {
  id: string;
  invoice_total: number | null;
}

/** True when an invoice has VAT/cess lines separate from fuel products. */
export function hasNonFuelLineItems(
  items: Array<{ product: string | null }>
): boolean {
  return items.some((item) => !isFuelProduct(item.product));
}

/**
 * When VAT/cess appear as separate line items, allocate the full invoice total
 * across fuel lines (EBMS and/or HSD-BSVI) in proportion to their extracted values.
 * A single fuel line — whether EBMS or HSD-BSVI — receives the entire invoice total.
 */
export function allocateFuelInvoiceValues(
  fuelItems: LineItemValueRow[],
  allItems: Array<{ invoice_id: string; product: string | null; invoice_value: number | null }>,
  invoices: InvoiceTotalRow[]
): Map<string, number> {
  const result = new Map<string, number>();
  const invoiceTotals = new Map(invoices.map((invoice) => [invoice.id, invoice.invoice_total]));
  const allItemsByInvoice = new Map<string, typeof allItems>();

  for (const item of allItems) {
    const list = allItemsByInvoice.get(item.invoice_id) ?? [];
    list.push(item);
    allItemsByInvoice.set(item.invoice_id, list);
  }

  const fuelByInvoice = new Map<string, LineItemValueRow[]>();
  for (const item of fuelItems) {
    const list = fuelByInvoice.get(item.invoice_id) ?? [];
    list.push(item);
    fuelByInvoice.set(item.invoice_id, list);
  }

  for (const [invoiceId, items] of fuelByInvoice) {
    const invoiceItems = allItemsByInvoice.get(invoiceId) ?? items;
    const invoiceTotal = invoiceTotals.get(invoiceId);
    const shouldAllocate =
      hasNonFuelLineItems(invoiceItems) &&
      invoiceTotal != null &&
      invoiceTotal > 0;

    const fuelSum = items.reduce((sum, item) => sum + (item.invoice_value ?? 0), 0);

    for (const item of items) {
      const raw = item.invoice_value ?? 0;
      const value =
        shouldAllocate && fuelSum > 0
          ? invoiceTotal * (raw / fuelSum)
          : raw;
      result.set(item.id, value);
    }
  }

  return result;
}
