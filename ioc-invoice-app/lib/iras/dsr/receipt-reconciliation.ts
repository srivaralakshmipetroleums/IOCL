import { roundMoney } from "@/lib/dashboard/format";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { InvoiceFuelLineByDate } from "@/lib/iras/dsr/gross-profit";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";

const LITRE_TOLERANCE = 1;

export type DsrReceiptReconciliationStatus =
  | "matched"
  | "mismatch"
  | "dsr_only"
  | "invoice_only"
  | "no_receipt";

export interface DsrReceiptReconciliationRow {
  date: string;
  product: IrasDsrProduct;
  dsrReceiptLitres: number | null;
  invoiceLitres: number | null;
  invoiceValue: number | null;
  litresDelta: number | null;
  status: DsrReceiptReconciliationStatus;
}

export interface DsrReceiptReconciliationSummary {
  total: number;
  matched: number;
  mismatch: number;
  dsrOnly: number;
  invoiceOnly: number;
  noReceipt: number;
}

function reconciliationStatus(
  dsrReceipt: number | null,
  invoiceLitres: number | null
): DsrReceiptReconciliationStatus {
  const receipt = dsrReceipt ?? 0;
  const invoice = invoiceLitres ?? 0;

  if (receipt <= 0 && invoice <= 0) return "no_receipt";
  if (receipt > 0 && invoice <= 0) return "dsr_only";
  if (receipt <= 0 && invoice > 0) return "invoice_only";
  return Math.abs(receipt - invoice) <= LITRE_TOLERANCE ? "matched" : "mismatch";
}

export function computeDsrReceiptReconciliation(
  rows: DsrLedgerRow[],
  invoiceByDateProduct: Map<string, InvoiceFuelLineByDate>
): { rows: DsrReceiptReconciliationRow[]; summary: DsrReceiptReconciliationSummary } {
  const reconRows: DsrReceiptReconciliationRow[] = [];

  for (const row of rows) {
    const dsrReceipt = row.receiptAsAutomation;
    const invoice = invoiceByDateProduct.get(`${row.date}::${row.product}`);
    const invoiceLitres = invoice?.litres ?? null;
    const status = reconciliationStatus(dsrReceipt, invoiceLitres);

    if (status === "no_receipt") continue;

    reconRows.push({
      date: row.date,
      product: row.product,
      dsrReceiptLitres: dsrReceipt,
      invoiceLitres,
      invoiceValue: invoice?.value ?? null,
      litresDelta:
        dsrReceipt != null && invoiceLitres != null
          ? roundMoney(dsrReceipt - invoiceLitres)
          : null,
      status,
    });
  }

  const summary: DsrReceiptReconciliationSummary = {
    total: reconRows.length,
    matched: reconRows.filter((row) => row.status === "matched").length,
    mismatch: reconRows.filter((row) => row.status === "mismatch").length,
    dsrOnly: reconRows.filter((row) => row.status === "dsr_only").length,
    invoiceOnly: reconRows.filter((row) => row.status === "invoice_only").length,
    noReceipt: 0,
  };

  return { rows: reconRows, summary };
}
