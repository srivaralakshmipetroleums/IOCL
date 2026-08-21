import type { SupabaseClient } from "@supabase/supabase-js";
import { computeBankReportSummary } from "@/lib/bank/report-metrics";
import { loadBankDashboardData } from "@/lib/bank/load-dashboard";
import {
  bankRowsForPadReconciliation,
  padRowsForBankReconciliation,
  reconcileBankPadIocl,
} from "@/lib/bank/reconcile-pad-iocl";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import { normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";
import { loadPadDashboardData } from "@/lib/pad/load-dashboard";
import { computeFuelSalesReport } from "@/lib/stock/fuel-sales-report";
import { getStockSnapshots } from "@/lib/stock/repository";
import { resolveStockForPeriod, stockProductFromFuel } from "@/lib/stock/resolve-period";
import type { BusinessDashboardPayload, StockProduct } from "@/lib/stock/types";

function emptyPurchases(): Record<StockProduct, number> {
  return { MS: 0, HSD: 0 };
}

export async function loadBusinessDashboard(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<BusinessDashboardPayload> {
  const dateFrom = filters.dateFrom ?? "";
  const dateTo = filters.dateTo ?? "";

  const [snapshots, padData, bankData, invoices] = await Promise.all([
    getStockSnapshots(supabase),
    loadPadDashboardData(supabase, filters),
    loadBankDashboardData(supabase, filters),
    getFilteredInvoices(supabase, filters),
  ]);

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product, invoices);

  const purchasesByProduct = emptyPurchases();
  let totalValue = 0;
  let totalQuantityLitres = 0;

  for (const item of lineItems) {
    const fuel = normalizeFuelProduct(item.product);
    if (!fuel) continue;
    const litres = Number(item.output_quantity) || 0;
    const stockProduct = stockProductFromFuel(fuel);
    purchasesByProduct[stockProduct] += litres;
    totalQuantityLitres += litres;
    totalValue += Number(item.invoice_value) || 0;
  }

  const fuelInvoiceIds = new Set(lineItems.map((item) => item.invoice_id));
  const stock = resolveStockForPeriod(snapshots, dateFrom, dateTo, purchasesByProduct);

  const bankReport = computeBankReportSummary(
    bankData.transactions,
    bankData.summary,
    bankData.walletMissedDays.length
  );

  const bankRows = bankRowsForPadReconciliation(bankData.transactions);
  const padRows = padRowsForBankReconciliation(padData.transactions);
  const reconRows = reconcileBankPadIocl(bankRows, padRows);

  const padKl = padData.summary.fuelQuantityKl * 1000;
  const invoiceKlDiff =
    totalQuantityLitres > 0 || padKl > 0 ? totalQuantityLitres - padKl : null;

  const fuelSalesReport = computeFuelSalesReport({
    stock,
    dateFrom,
    dateTo,
    invoices,
    lineItems,
    retailPrices: padData.retailPrices,
    padTransactions: padData.transactions,
    padCharges: padData.charges,
    bankTransactions: bankData.transactions,
    bankSummary: bankData.summary,
    padClosingBalance: padData.summary.closingBalance,
  });

  return {
    stock,
    fuelSalesReport,
    invoice: {
      invoiceCount: fuelInvoiceIds.size,
      totalValue,
      totalQuantityLitres,
      msPurchasesLitres: purchasesByProduct.MS,
      hsdPurchasesLitres: purchasesByProduct.HSD,
    },
    pad: {
      openingBalance: padData.summary.openingBalance,
      closingBalance: padData.summary.closingBalance,
      fuelPurchaseValue: padData.summary.fuelPurchaseValue,
      fuelQuantityKl: padData.summary.fuelQuantityKl,
      grossPumpProfit: padData.summary.grossPumpProfit,
      ioclPayments: padData.summary.moneyInvestedSbi,
    },
    bank: {
      openingBalance: bankData.summary.openingBalance,
      closingBalance: bankData.summary.closingBalance,
      totalCollections: bankReport.totalCollections,
      ioclPayments: bankData.summary.ioclPayments,
      netOperatingCash: bankReport.netOperatingCash,
    },
    reconciliation: {
      bankPadIoclMatched: reconRows.filter((row) => row.status === "MATCHED").length,
      bankPadIoclMismatch: reconRows.filter((row) => row.status === "AMOUNT_MISMATCH").length,
      bankPadIoclBankOnly: reconRows.filter((row) => row.status === "BANK_ONLY").length,
      bankPadIoclPadOnly: reconRows.filter((row) => row.status === "PAD_ONLY").length,
      invoiceVsPadKlDiff: invoiceKlDiff,
    },
  };
}
