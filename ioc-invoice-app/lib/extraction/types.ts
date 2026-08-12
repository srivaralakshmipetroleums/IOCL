export interface InvoiceInput {
  pdfBuffer: Buffer;
  filename: string;
}

export interface ExtractedInvoice {
  invoice: {
    invoice_number: string;
    invoice_date: string;
    supplier_name: string;
    supplier_code?: string | null;
    consignee_name?: string | null;
    payer_name?: string | null;
    delivery_number?: string | null;
    sales_order_number?: string | null;
    po_reference?: string | null;
    sap_entry_number?: string | null;
    transport_number?: string | null;
    invoice_total?: number | null;
    rounding_difference?: number | null;
  };
  line_items: Array<{
    material_code?: string | null;
    product: string;
    quantity: number;
    unit: string;
    rate?: number | null;
    hsn_code?: string | null;
    invoice_value: number;
  }>;
  raw_response?: unknown;
}

export interface InvoiceExtractor {
  extract(input: InvoiceInput): Promise<ExtractedInvoice>;
}
