import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import {
  computeBalanceTrend,
  computeCashFlowByMonth,
  computeChargeReport,
  computeCommissionYtd,
  computeCommissionsByMonth,
  computeExecutiveSummary,
  computeFuelProfitByMonth,
  computeFuelProfitRows,
} from "@/lib/pad/metrics";
import { computeInvoiceMsHsdRateTrend, invoiceRateTrendToFuelPurchases, computeInvoiceGrossProfitByMonth } from "@/lib/pad/invoice-rate-trend";
import {
  getPadStatements,
  getPadTransactions,
  getRetailPrices,
} from "@/lib/pad/query-helpers";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";

export async function loadPadDashboardData(
  supabase: SupabaseClient,
  filters: DashboardFilters
) {
  const [transactions, statements, retailPrices, invoices] = await Promise.all([
    getPadTransactions(supabase, filters),
    getPadStatements(supabase, filters),
    getRetailPrices(supabase),
    getFilteredInvoices(supabase, filters),
  ]);

  const lineItems = await getFilteredLineItems(
    supabase,
    invoices.map((invoice) => invoice.id),
    filters.product,
    invoices
  );

  const profitRows = computeFuelProfitRows(transactions, retailPrices);
  const rateTrend = computeInvoiceMsHsdRateTrend(invoices, lineItems, retailPrices);
  const grossProfitByMonth = computeInvoiceGrossProfitByMonth(rateTrend, transactions);
  const summary = computeExecutiveSummary(
    transactions,
    statements,
    retailPrices,
    filters.dateFrom,
    filters.dateTo
  );
  summary.grossPumpProfit = grossProfitByMonth.reduce((sum, row) => sum + row.netProfit, 0);
  summary.retailRevenue = rateTrend.reduce((sum, row) => {
    const ms = (row.msRetailPerL ?? 0) * row.msKl * 1000;
    const hsd = (row.hsdRetailPerL ?? 0) * row.hsdKl * 1000;
    return sum + ms + hsd;
  }, 0);
  const invoiceMsKl = rateTrend.reduce((sum, row) => sum + row.msKl, 0);
  const invoiceHsdKl = rateTrend.reduce((sum, row) => sum + row.hsdKl, 0);
  summary.fuelMsKl = invoiceMsKl;
  summary.fuelHsdKl = invoiceHsdKl;
  summary.fuelQuantityKl = invoiceMsKl + invoiceHsdKl;

  return {
    transactions,
    statements,
    retailPrices,
    profitRows,
    summary,
    balanceTrend: computeBalanceTrend(transactions),
    cashFlow: computeCashFlowByMonth(transactions),
    fuelPurchases: invoiceRateTrendToFuelPurchases(rateTrend),
    commissions: computeCommissionsByMonth(transactions),
    commissionYtd: computeCommissionYtd(transactions),
    charges: computeChargeReport(transactions),
    fuelProfitByMonth: computeFuelProfitByMonth(profitRows),
    grossProfitByMonth,
    rateTrend,
  };
}
