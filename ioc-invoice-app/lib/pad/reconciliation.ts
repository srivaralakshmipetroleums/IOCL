import { isFuelSupplyRow } from "@/lib/pad/query-helpers";
import type { PadTransactionRow } from "@/lib/pad/types";
import { sapBillingMatchKey } from "@/lib/invoices/iocl-invoice-number";

export type ReconciliationStatus =
  | "MATCHED"
  | "PAD_ONLY"
  | "INVOICE_ONLY"
  | "AMOUNT_MISMATCH";

export interface InvoiceMatchRow {
  id: string;
  invoice_number: string;
  sap_entry_number?: string | null;
  invoice_date: string;
  invoice_total: number;
  quantityKl: number;
}

export interface PadReconciliationRow {
  padTransactionId: string;
  billingDoc: string | null;
  padDate: string | null;
  padDebit: number;
  padQuantityKl: number | null;
  product: "MS" | "HSD" | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTotal: number | null;
  invoiceQuantityKl: number | null;
  status: ReconciliationStatus;
  mismatchReason: string | null;
}

export function extractPadBillingDoc(
  documentNumber: string | null,
  itemText: string
): string | null {
  const source = (documentNumber || itemText || "").trim();
  const match = source.match(/(\d{10})/);
  return match ? match[1] : null;
}

function indexInvoiceNumbers(invoices: InvoiceMatchRow[]): Map<string, InvoiceMatchRow> {
  const invoiceByNumber = new Map<string, InvoiceMatchRow>();
  for (const invoice of invoices) {
    for (const value of [invoice.invoice_number, invoice.sap_entry_number]) {
      const key = sapBillingMatchKey(value);
      if (key) invoiceByNumber.set(key, invoice);
    }
  }
  return invoiceByNumber;
}

function amountsClose(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function reconcilePadWithInvoices(
  padTransactions: PadTransactionRow[],
  invoices: InvoiceMatchRow[]
): PadReconciliationRow[] {
  const invoiceByNumber = indexInvoiceNumbers(invoices);

  const matchedInvoiceIds = new Set<string>();
  const rows: PadReconciliationRow[] = [];

  for (const pad of padTransactions) {
    if (!isFuelSupplyRow(pad)) continue;

    const billingDoc = extractPadBillingDoc(pad.document_number, pad.item_text);
    const invoice = billingDoc
      ? invoiceByNumber.get(sapBillingMatchKey(billingDoc) ?? "")
      : undefined;

    const product =
      pad.category === "FUEL_MS" ? "MS" : pad.category === "FUEL_HSD" ? "HSD" : null;

    if (!invoice) {
      rows.push({
        padTransactionId: pad.id,
        billingDoc,
        padDate: pad.transaction_date,
        padDebit: pad.debit - pad.credit,
        padQuantityKl: pad.quantity,
        product,
        invoiceId: null,
        invoiceNumber: null,
        invoiceDate: null,
        invoiceTotal: null,
        invoiceQuantityKl: null,
        status: "PAD_ONLY",
        mismatchReason: billingDoc
          ? `No invoice found for billing doc ${billingDoc}`
          : "Could not extract billing document number",
      });
      continue;
    }

    matchedInvoiceIds.add(invoice.id);

    const padAmount = pad.debit - pad.credit;
    const amountMatch = amountsClose(padAmount, invoice.invoice_total);

    const status: ReconciliationStatus = amountMatch ? "MATCHED" : "AMOUNT_MISMATCH";
    const mismatchReason = amountMatch
      ? null
      : `Amount PAD ₹${padAmount.toFixed(2)} vs invoice ₹${invoice.invoice_total.toFixed(2)}`;

    rows.push({
      padTransactionId: pad.id,
      billingDoc,
      padDate: pad.transaction_date,
      padDebit: padAmount,
      padQuantityKl: pad.quantity,
      product,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      invoiceTotal: invoice.invoice_total,
      invoiceQuantityKl: invoice.quantityKl,
      status,
      mismatchReason,
    });
  }

  for (const invoice of invoices) {
    if (matchedInvoiceIds.has(invoice.id)) continue;
    rows.push({
      padTransactionId: "",
      billingDoc: invoice.invoice_number,
      padDate: null,
      padDebit: 0,
      padQuantityKl: null,
      product: null,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.invoice_date,
      invoiceTotal: invoice.invoice_total,
      invoiceQuantityKl: invoice.quantityKl,
      status: "INVOICE_ONLY",
      mismatchReason: "Invoice has no matching PAD fuel debit",
    });
  }

  return rows.sort((a, b) => {
    const dateA = a.padDate || a.invoiceDate || "";
    const dateB = b.padDate || b.invoiceDate || "";
    return dateB.localeCompare(dateA);
  });
}
