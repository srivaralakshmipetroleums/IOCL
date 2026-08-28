import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";
import { summarizeDayClosing } from "@/lib/day-close/stored-to-compute";
import { listDayClosingsInRange } from "@/lib/day-close/repository";
import {
  DEFAULT_MIN_SPREAD_PER_LITRE,
  detectRspChanges,
} from "@/lib/pad/rsp-margin-watch";
import { getRetailPrices } from "@/lib/pad/query-helpers";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const minSpread = Number(request.nextUrl.searchParams.get("minSpread"));
  const supabase = await createServiceClient();

  const [prices, invoices, dayClosings] = await Promise.all([
    getRetailPrices(supabase, filters),
    getFilteredInvoices(supabase, filters),
    listDayClosingsInRange(supabase, filters.dateFrom ?? "1970-01-01", filters.dateTo ?? "2099-12-31"),
  ]);

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product, invoices);

  const invoiceLines = lineItems.map((item) => {
    const invoice = invoices.find((row) => row.id === item.invoice_id);
    return {
      invoice_date: invoice?.invoice_date ?? null,
      product: item.product,
      invoice_value: item.invoice_value,
      output_quantity: item.output_quantity,
    };
  });

  const dayCloseLitres = dayClosings.map((closing) => {
    const summary = summarizeDayClosing(closing);
    return {
      business_date: summary.businessDate,
      msSaleLitres: summary.msSaleLitres,
      hsdSaleLitres: summary.hsdSaleLitres,
    };
  });

  const changes = detectRspChanges(prices, invoiceLines, dayCloseLitres, {
    minSpreadPerLitre: Number.isFinite(minSpread) ? minSpread : DEFAULT_MIN_SPREAD_PER_LITRE,
  });

  return NextResponse.json({
    minSpreadPerLitre: Number.isFinite(minSpread) ? minSpread : DEFAULT_MIN_SPREAD_PER_LITRE,
    changes,
    alerts: changes.filter((row) => row.belowThreshold),
  });
}
