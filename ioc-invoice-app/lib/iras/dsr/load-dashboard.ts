import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";
import {
  aggregateInvoiceFuelByDate,
  attachGrossProfitToLedgerRows,
} from "@/lib/iras/dsr/gross-profit";
import {
  buildDsrLedgerRows,
  buildDsrProductSalesSummary,
  computeDsrDailyVolume,
  computeDsrExecutiveSummary,
  computeDsrGrossProfitByMonth,
  computeDsrStockTrend,
  computeDsrTotalizerByMonth,
  computeDsrVolumeByMonth,
  listMissingDsrDates,
  type DsrDailyVolumePoint,
  type DsrExecutiveSummary,
  type DsrGrossProfitMonth,
  type DsrProductSalesSummary,
  type DsrStockPoint,
  type DsrTotalizerMonth,
  type DsrVolumeMonth,
} from "@/lib/iras/dsr/metrics";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import { getDsrMeterLookbackEntries, getDsrRecordsInPeriod } from "@/lib/iras/dsr/query-helpers";
import {
  computeDsrReceiptReconciliation,
  type DsrReceiptReconciliationRow,
  type DsrReceiptReconciliationSummary,
} from "@/lib/iras/dsr/receipt-reconciliation";
import { getRetailPrices } from "@/lib/pad/query-helpers";

export interface DsrDashboardData {
  summary: DsrExecutiveSummary;
  productSalesSummary: DsrProductSalesSummary[];
  volumeByMonth: DsrVolumeMonth[];
  totalizerByMonth: DsrTotalizerMonth[];
  grossProfitByMonth: DsrGrossProfitMonth[];
  dailyVolume: DsrDailyVolumePoint[];
  stockTrend: DsrStockPoint[];
  missingDates: string[];
  ledgerRows: DsrLedgerRow[];
  receiptReconciliation: {
    rows: DsrReceiptReconciliationRow[];
    summary: DsrReceiptReconciliationSummary;
  };
}

function requirePeriod(filters: DashboardFilters): { dateFrom: string; dateTo: string } {
  if (!filters.dateFrom || !filters.dateTo) {
    throw new Error("dateFrom and dateTo are required");
  }
  return { dateFrom: filters.dateFrom, dateTo: filters.dateTo };
}

async function loadInvoiceFuelByDateProduct(
  supabase: SupabaseClient,
  filters: DashboardFilters,
  options: { throughDateOnly: boolean }
) {
  const invoiceFilters: DashboardFilters = options.throughDateOnly
    ? { dateTo: filters.dateTo, supplier: filters.supplier }
    : filters;

  const invoices = await getFilteredInvoices(supabase, invoiceFilters);
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const invoiceDateById = new Map(invoices.map((invoice) => [invoice.id, invoice.invoice_date]));
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, undefined, invoices);

  return aggregateInvoiceFuelByDate(
    lineItems.map((line) => ({
      invoice_date: invoiceDateById.get(line.invoice_id) ?? null,
      product: line.product,
      output_quantity: line.output_quantity,
      invoice_value: line.invoice_value,
    }))
  );
}

export async function loadDsrDashboardData(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<DsrDashboardData> {
  const { dateFrom, dateTo } = requirePeriod(filters);

  const [entries, lookbackEntries, retailPrices, periodInvoiceFuelByDate, purchaseInvoiceFuelByDate] =
    await Promise.all([
      getDsrRecordsInPeriod(supabase, {
        dateFrom,
        dateTo,
        months: filters.months,
      }),
      getDsrMeterLookbackEntries(supabase, dateFrom),
      getRetailPrices(supabase),
      loadInvoiceFuelByDateProduct(supabase, filters, { throughDateOnly: false }),
      loadInvoiceFuelByDateProduct(supabase, filters, { throughDateOnly: true }),
    ]);

  const baseLedgerRows = buildDsrLedgerRows([...lookbackEntries, ...entries]);
  const ledgerRows = attachGrossProfitToLedgerRows(
    baseLedgerRows.filter((row) => row.date >= dateFrom && row.date < dateTo),
    retailPrices,
    purchaseInvoiceFuelByDate
  );

  const summary = computeDsrExecutiveSummary(ledgerRows, dateFrom, dateTo);

  return {
    summary,
    productSalesSummary: buildDsrProductSalesSummary(summary),
    volumeByMonth: computeDsrVolumeByMonth(ledgerRows, dateFrom, dateTo, filters.months),
    totalizerByMonth: computeDsrTotalizerByMonth(ledgerRows, dateFrom, dateTo, filters.months),
    grossProfitByMonth: computeDsrGrossProfitByMonth(ledgerRows),
    dailyVolume: computeDsrDailyVolume(ledgerRows),
    stockTrend: computeDsrStockTrend(ledgerRows),
    missingDates: listMissingDsrDates(ledgerRows, dateFrom, dateTo),
    ledgerRows,
    receiptReconciliation: computeDsrReceiptReconciliation(
      ledgerRows,
      periodInvoiceFuelByDate
    ),
  };
}
