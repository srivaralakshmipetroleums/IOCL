import type { ExtractedInvoice, InvoiceExtractor, InvoiceInput } from "./types";

const FIXTURE_INVOICE: ExtractedInvoice = {
  invoice: {
    invoice_number: "7009317047",
    invoice_date: "2026-07-31",
    supplier_name: "Indian Oil Corporation Limited",
    supplier_code: "IOCL",
    invoice_total: 1538842.33,
    rounding_difference: 0,
  },
  line_items: [
    {
      material_code: "EBMS",
      product: "EBMS",
      quantity: 9,
      unit: "KL",
      rate: 113786.02,
      hsn_code: "2710 12 42",
      invoice_value: 1024074.15,
    },
    {
      material_code: "HSD-BSVI",
      product: "HSD-BSVI",
      quantity: 5,
      unit: "KL",
      rate: 102953.64,
      hsn_code: "2710 19 44",
      invoice_value: 514768.18,
    },
  ],
};

export class LocalInvoiceExtractor implements InvoiceExtractor {
  async extract(_input: InvoiceInput): Promise<ExtractedInvoice> {
    return { ...FIXTURE_INVOICE, raw_response: FIXTURE_INVOICE };
  }
}

export function getFixtureInvoice(): ExtractedInvoice {
  return FIXTURE_INVOICE;
}
