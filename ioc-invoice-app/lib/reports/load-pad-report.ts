import { createServiceClient } from "@/lib/supabase/server";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import { normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import { loadPadDashboardData } from "@/lib/pad/load-dashboard";
import { isFuelSupplyRow } from "@/lib/pad/query-helpers";
import { isChargeRow } from "@/lib/pad/fee-classify";
import { isFleetCardPayment } from "@/lib/pad/categorize";
import { reconcilePadWithInvoices, type PadReconciliationRow } from "@/lib/pad/reconciliation";
import { buildRetailPriceLookup } from "@/lib/pad/retail-price-lookup";
import type {
  PadCashFlowMonth,
  PadChargeReport,
  PadExecutiveSummary,
  PadGrossProfitMonth,
  PadRateTrendPoint,
} from "@/lib/pad/metrics";
import type { PadTransactionRow, RetailPriceRow } from "@/lib/pad/types";

export interface PadReportPeriod {
  dateFrom: string;
  dateTo: string;
  label: string;
  months?: string[];
}

export interface PadFuelPurchaseLine {
  invoiceDate: string;
  billNo: string;
  product: string;
  quantityKl: number;
  quantityL: number;
  invoiceValue: number;
  purchasePerL: number | null;
  rspPerL: number | null;
  spreadPerL: number | null;
  lineProfit: number | null;
  hsn: string;
}

export interface PadMoneyInRow {
  date: string | null;
  type: string;
  reference: string;
  credit: number;
}

export interface PadReportDataset {
  period: PadReportPeriod;
  dealerName: string;
  customerCode: string;
  generatedAt: string;
  summary: PadExecutiveSummary;
  rateTrend: PadRateTrendPoint[];
  cashFlow: PadCashFlowMonth[];
  grossProfitByMonth: PadGrossProfitMonth[];
  fuelLines: PadFuelPurchaseLine[];
  transactions: PadTransactionRow[];
  charges: PadChargeReport;
  moneyIn: PadMoneyInRow[];
  reconciliation: PadReconciliationRow[];
  reconciliationSummary: {
    total: number;
    matched: number;
    padOnly: number;
    invoiceOnly: number;
    mismatches: number;
  };
  retailPrices: RetailPriceRow[];
}

function moneyInType(row: PadTransactionRow): string | null {
  if (row.credit <= 0) return null;
  if (row.category === "PAYMENT") {
    return isFleetCardPayment(row.document_type, row.item_text) ? "Fleet card" : "SBI deposit";
  }
  if (row.category === "MARGIN") return "Dealer margin";
  if (row.category === "DISCOUNT") return "Discount";
  if (row.category === "CREDIT_MEMO") return "Credit memo";
  return null;
}

export function ledgerFillHint(row: PadTransactionRow): "fuel" | "payment" | "margin" | "charge" | null {
  if (row.category === "FUEL_MS" || row.category === "FUEL_HSD") return "fuel";
  if (row.category === "PAYMENT") return "payment";
  if (row.category === "MARGIN" || row.category === "DISCOUNT") return "margin";
  if (isChargeRow(row)) return "charge";
  return null;
}

function retailPricesForPeriod(
  prices: RetailPriceRow[],
  dateFrom: string,
  dateTo: string
): RetailPriceRow[] {
  const inRange = prices.filter((row) => {
    const date = row.effective_from.slice(0, 10);
    return date >= dateFrom && date <= dateTo;
  });
  const before = prices.filter((row) => row.effective_from.slice(0, 10) < dateFrom);
  const lastBefore = (product: "MS" | "HSD") => {
    const match = before.filter((row) => row.product === product).at(-1);
    return match ? [match] : [];
  };
  const combined = [...lastBefore("MS"), ...lastBefore("HSD"), ...inRange];
  const seen = new Set<string>();
  return combined.filter((row) => {
    const key = `${row.product}|${row.effective_from.slice(0, 10)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadPadReportDataset(period: PadReportPeriod): Promise<PadReportDataset> {
  const filters: DashboardFilters = {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    months: period.months,
  };

  const supabase = await createServiceClient();
  const dashboard = await loadPadDashboardData(supabase, filters);
  const lookup = buildRetailPriceLookup(dashboard.retailPrices);

  const qtyByInvoice = new Map<string, number>();
  const fuelLines: PadFuelPurchaseLine[] = [];
  const invoiceById = new Map(dashboard.invoices.map((invoice) => [invoice.id, invoice]));

  for (const item of dashboard.lineItems) {
    const litres = Number(item.output_quantity) || 0;
    qtyByInvoice.set(item.invoice_id, (qtyByInvoice.get(item.invoice_id) ?? 0) + litres / 1000);

    const product = normalizeFuelProduct(item.product);
    if (!product) continue;

    const invoice = invoiceById.get(item.invoice_id);
    const date = invoice?.invoice_date || "";
    const value = Number(item.invoice_value) || 0;
    const purchasePerL = litres > 0 ? value / litres : null;
    const rspPerL = date ? lookup(product === "EBMS" ? "MS" : "HSD", date) : null;
    const spreadPerL =
      purchasePerL != null && rspPerL != null ? rspPerL - purchasePerL : null;

    fuelLines.push({
      invoiceDate: date,
      billNo: invoice?.invoice_number || invoice?.sap_entry_number || "",
      product,
      quantityKl: litres / 1000,
      quantityL: litres,
      invoiceValue: value,
      purchasePerL,
      rspPerL,
      spreadPerL,
      lineProfit: spreadPerL != null ? spreadPerL * litres : null,
      hsn: item.hsn_code || "",
    });
  }

  fuelLines.sort((a, b) => {
    const byDate = a.invoiceDate.localeCompare(b.invoiceDate);
    if (byDate !== 0) return byDate;
    const byBill = a.billNo.localeCompare(b.billNo);
    if (byBill !== 0) return byBill;
    return a.product.localeCompare(b.product);
  });

  const invoiceRows = dashboard.invoices.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number ?? "",
    sap_entry_number: inv.sap_entry_number ?? null,
    invoice_date: inv.invoice_date ?? "",
    invoice_total: Number(inv.invoice_total) || 0,
    quantityKl: qtyByInvoice.get(inv.id) ?? 0,
  }));

  const reconciliation = reconcilePadWithInvoices(
    dashboard.transactions.filter(isFuelSupplyRow),
    invoiceRows
  );

  const moneyIn: PadMoneyInRow[] = dashboard.transactions
    .flatMap((row) => {
      const type = moneyInType(row);
      if (!type) return [];
      return [
        {
          date: row.transaction_date,
          type,
          reference: row.item_text || row.document_number || "",
          credit: row.credit,
        },
      ];
    })
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const statement = dashboard.statements[0];

  return {
    period,
    dealerName: statement?.customer_name || "SRI VARALAKSHMI PETROLEUMS",
    customerCode: statement?.customer_code || "330042",
    generatedAt: new Date().toISOString(),
    summary: dashboard.summary,
    rateTrend: dashboard.rateTrend,
    cashFlow: dashboard.cashFlow,
    grossProfitByMonth: dashboard.grossProfitByMonth,
    fuelLines,
    transactions: dashboard.transactions,
    charges: dashboard.charges,
    moneyIn,
    reconciliation,
    reconciliationSummary: {
      total: reconciliation.length,
      matched: reconciliation.filter((r) => r.status === "MATCHED").length,
      padOnly: reconciliation.filter((r) => r.status === "PAD_ONLY").length,
      invoiceOnly: reconciliation.filter((r) => r.status === "INVOICE_ONLY").length,
      mismatches: reconciliation.filter((r) => r.status === "AMOUNT_MISMATCH").length,
    },
    retailPrices: retailPricesForPeriod(
      dashboard.retailPrices,
      period.dateFrom,
      period.dateTo
    ),
  };
}
