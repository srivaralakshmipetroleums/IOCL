import type { ExtractedInvoice } from "@/lib/extraction/types";
import { convertLineItems } from "@/lib/invoices/quantity-converter";
import type { InvoiceInsert, InvoiceLineItemInsert } from "@/types/database";

export interface NormalizedInvoice {
  invoice: InvoiceInsert;
  lineItems: InvoiceLineItemInsert[];
  extractionResult: {
    provider: string;
    provider_version: string;
    raw_response: unknown;
    normalized_data: unknown;
  };
}

export function normalizeDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  const match = dateStr.match(/(\d{1,2})[-/](\w{3})[-/](\d{2,4})/i);
  if (match) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const day = match[1].padStart(2, "0");
    const month = months[match[2].toLowerCase().slice(0, 3)] || "01";
    let year = match[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

export function normalizeExtraction(
  extracted: ExtractedInvoice,
  options: { pdfStoragePath?: string; status?: string; provider?: string } = {}
): NormalizedInvoice {
  const convertedItems = convertLineItems(extracted.line_items);

  const invoice: InvoiceInsert = {
    invoice_number: extracted.invoice.invoice_number,
    invoice_date: normalizeDate(extracted.invoice.invoice_date),
    supplier_name: extracted.invoice.supplier_name,
    supplier_code: extracted.invoice.supplier_code ?? null,
    consignee_name: extracted.invoice.consignee_name ?? null,
    payer_name: extracted.invoice.payer_name ?? null,
    delivery_number: extracted.invoice.delivery_number ?? null,
    sales_order_number: extracted.invoice.sales_order_number ?? null,
    po_reference: extracted.invoice.po_reference ?? null,
    sap_entry_number: extracted.invoice.sap_entry_number ?? null,
    transport_number: extracted.invoice.transport_number ?? null,
    invoice_total: extracted.invoice.invoice_total ?? null,
    rounding_difference: extracted.invoice.rounding_difference ?? null,
    pdf_storage_path: options.pdfStoragePath ?? null,
    source_type: "MANUAL_UPLOAD",
    status: options.status ?? "EXTRACTED",
  };

  const lineItems: InvoiceLineItemInsert[] = convertedItems.map((item) => ({
    invoice_id: "",
    material_code: item.material_code ?? null,
    product: item.product,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate ?? null,
    hsn_code: item.hsn_code ?? null,
    invoice_value: item.invoice_value,
    output_quantity: item.output_quantity,
    output_measure: item.output_measure,
  }));

  return {
    invoice,
    lineItems,
    extractionResult: {
      provider: options.provider ?? (process.env.ANTHROPIC_API_KEY ? "claude" : "local"),
      provider_version: "1.0",
      raw_response: extracted.raw_response ?? extracted,
      normalized_data: { invoice, lineItems },
    },
  };
}
