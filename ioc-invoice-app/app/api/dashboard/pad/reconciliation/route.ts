import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { isFuelSupplyRow, getPadTransactions } from "@/lib/pad/query-helpers";
import { reconcilePadWithInvoices } from "@/lib/pad/reconciliation";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();

  const [padTransactions, invoicesResult, lineItemsResult] = await Promise.all([
    getPadTransactions(supabase, filters),
    supabase
      .from("invoices")
      .select("id, invoice_number, sap_entry_number, invoice_date, invoice_total")
      .gte("invoice_date", filters.dateFrom ?? "1900-01-01")
      .lte("invoice_date", filters.dateTo ?? "2099-12-31"),
    supabase.from("invoice_line_items").select("invoice_id, output_quantity, product"),
  ]);

  if (invoicesResult.error) throw invoicesResult.error;
  if (lineItemsResult.error) throw lineItemsResult.error;

  const qtyByInvoice = new Map<string, number>();
  for (const item of lineItemsResult.data ?? []) {
    const litres = Number(item.output_quantity) || 0;
    const kl = litres / 1000;
    qtyByInvoice.set(item.invoice_id, (qtyByInvoice.get(item.invoice_id) ?? 0) + kl);
  }

  const invoices = (invoicesResult.data ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number ?? "",
    sap_entry_number: inv.sap_entry_number ?? null,
    invoice_date: inv.invoice_date ?? "",
    invoice_total: Number(inv.invoice_total) || 0,
    quantityKl: qtyByInvoice.get(inv.id) ?? 0,
  }));

  const fuelPadRows = padTransactions.filter(isFuelSupplyRow);
  const rows = reconcilePadWithInvoices(fuelPadRows, invoices);

  const summary = {
    total: rows.length,
    matched: rows.filter((r) => r.status === "MATCHED").length,
    padOnly: rows.filter((r) => r.status === "PAD_ONLY").length,
    invoiceOnly: rows.filter((r) => r.status === "INVOICE_ONLY").length,
    mismatches: rows.filter(
      (r) => r.status === "AMOUNT_MISMATCH"
    ).length,
  };

  return NextResponse.json({ rows, summary });
}
