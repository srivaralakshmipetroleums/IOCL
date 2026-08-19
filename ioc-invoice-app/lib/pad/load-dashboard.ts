import type { SupabaseClient } from "@supabase/supabase-js";
import { fillMonthsInPeriod, type DashboardFilters } from "@/lib/dashboard/filters";
import {
  computeBalanceTrend,
  computeCashFlowByMonth,
  computeChargeReport,
  computeCommissionYtd,
  computeCommissionsByMonth,
  computeExecutiveSummary,
  computeFuelProfitByMonth,
  computeFuelProfitRows,
  type PadCashFlowMonth,
  type PadCommissionMonth,
  type PadFuelPurchaseMonth,
  type PadGrossProfitMonth,
  type PadRateTrendPoint,
} from "@/lib/pad/metrics";
import { computeInvoiceMsHsdRateTrend, invoiceRateTrendToFuelPurchases, computeInvoiceGrossProfitByMonth } from "@/lib/pad/invoice-rate-trend";
import {
  getPadStatements,
  getPadTransactions,
  getRetailPrices,
} from "@/lib/pad/query-helpers";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";

function emptyCashFlow(month: string): PadCashFlowMonth {
  return {
    month,
    creditsIn: 0,
    debitsOut: 0,
    payments: 0,
    margin: 0,
    discounts: 0,
    fuelDebits: 0,
    charges: 0,
  };
}

function emptyCommission(month: string): PadCommissionMonth {
  return { month, margin: 0, discount: 0 };
}

function emptyFuel(month: string): PadFuelPurchaseMonth {
  return { month, msKl: 0, hsdKl: 0, msValue: 0, hsdValue: 0 };
}

function emptyGrossProfit(month: string): PadGrossProfitMonth {
  return {
    month,
    msProfit: 0,
    hsdProfit: 0,
    dealerMargin: 0,
    discount: 0,
    charges: 0,
    fuelProfit: 0,
    netProfit: 0,
  };
}

function emptyRateTrend(month: string): PadRateTrendPoint {
  return {
    month,
    msPurchasePerL: null,
    hsdPurchasePerL: null,
    msRetailPerL: null,
    hsdRetailPerL: null,
    msSpreadPerL: null,
    hsdSpreadPerL: null,
    msKl: 0,
    hsdKl: 0,
    totalKl: 0,
  };
}

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
  const rateTrend = fillMonthsInPeriod(
    computeInvoiceMsHsdRateTrend(invoices, lineItems, retailPrices),
    filters.dateFrom,
    filters.dateTo,
    filters.months,
    emptyRateTrend
  );
  const grossProfitByMonth = fillMonthsInPeriod(
    computeInvoiceGrossProfitByMonth(rateTrend, transactions),
    filters.dateFrom,
    filters.dateTo,
    filters.months,
    emptyGrossProfit
  );
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
    cashFlow: fillMonthsInPeriod(
      computeCashFlowByMonth(transactions),
      filters.dateFrom,
      filters.dateTo,
      filters.months,
      emptyCashFlow
    ),
    fuelPurchases: fillMonthsInPeriod(
      invoiceRateTrendToFuelPurchases(rateTrend),
      filters.dateFrom,
      filters.dateTo,
      filters.months,
      emptyFuel
    ),
    commissions: fillMonthsInPeriod(
      computeCommissionsByMonth(transactions),
      filters.dateFrom,
      filters.dateTo,
      filters.months,
      emptyCommission
    ),
    commissionYtd: computeCommissionYtd(transactions),
    charges: computeChargeReport(transactions),
    fuelProfitByMonth: computeFuelProfitByMonth(profitRows),
    grossProfitByMonth,
    rateTrend,
  };
}
