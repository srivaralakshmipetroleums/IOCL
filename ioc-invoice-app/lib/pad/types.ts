import type { PadTransactionCategory } from "@/lib/pad/categorize";

export interface PadTransactionRow {
  id: string;
  statement_id: string;
  line_number: number;
  plant: string | null;
  item_text: string;
  document_type: string | null;
  document_number: string | null;
  transaction_date: string | null;
  material_group: string | null;
  quantity: number | null;
  unit: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  category: PadTransactionCategory;
}

export interface PadStatementRow {
  id: string;
  fy_label: string;
  period_from: string;
  period_to: string;
  customer_name: string | null;
  customer_code: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  open_delivery_value: number | null;
}

export type RetailProduct = "MS" | "HSD";

export interface RetailPriceRow {
  id?: string;
  product: RetailProduct;
  effective_from: string;
  price_per_litre: number;
  notes?: string | null;
  source_message_id?: string | null;
  source_type?: string | null;
}

export type FeeSubtype =
  | "RENTAL"
  | "INTEREST"
  | "PENALTY"
  | "PARTICIPATION"
  | "LICENSE"
  | "OTHER_FEE";
