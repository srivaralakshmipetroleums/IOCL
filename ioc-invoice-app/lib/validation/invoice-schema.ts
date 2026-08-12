import { z } from "zod";

export const lineItemSchema = z.object({
  material_code: z.string().nullable().optional(),
  product: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  rate: z.number().nonnegative().nullable().optional(),
  hsn_code: z.string().nullable().optional(),
  invoice_value: z.number().nonnegative(),
});

export const invoiceHeaderSchema = z.object({
  invoice_number: z.string().min(1),
  invoice_date: z.string().min(1),
  supplier_name: z.string().min(1),
  supplier_code: z.string().nullable().optional(),
  consignee_name: z.string().nullable().optional(),
  payer_name: z.string().nullable().optional(),
  delivery_number: z.string().nullable().optional(),
  sales_order_number: z.string().nullable().optional(),
  po_reference: z.string().nullable().optional(),
  sap_entry_number: z.string().nullable().optional(),
  transport_number: z.string().nullable().optional(),
  invoice_total: z.number().nonnegative().nullable().optional(),
  rounding_difference: z.number().nullable().optional(),
});

export const extractedInvoiceSchema = z.object({
  invoice: invoiceHeaderSchema,
  line_items: z.array(lineItemSchema).min(1),
});

export type ExtractedInvoiceData = z.infer<typeof extractedInvoiceSchema>;
export type ExtractedLineItem = z.infer<typeof lineItemSchema>;
export type ExtractedInvoiceHeader = z.infer<typeof invoiceHeaderSchema>;
