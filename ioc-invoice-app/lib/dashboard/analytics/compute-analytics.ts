import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import { getFinancialYearPeriod } from "@/lib/dashboard/period";
import { getMonthRange, listMonthsInPeriod } from "@/lib/dashboard/filters";
import { FUEL_PRODUCTS, normalizeFuelProduct, type FuelProduct } from "@/lib/dashboard/fuel-products";
import { getFilteredInvoices, getFilteredLineItems } from "@/lib/dashboard/query-helpers";
import { getMonthlyTarget } from "@/lib/dashboard/analytics/targets";
import { getCompletedMonthsForComparison } from "@/lib/dashboard/analytics/month-utils";
import type {
  AnalyticsAnomaly,
  AnalyticsRankings,
  AnalyticsSnapshot,
  DashboardAnalytics,
  DayOfMonthPoint,
  DispatchExtreme,
  FySummary,
  MonthRank,
  MonthlyAnalyticsRow,
} from "@/lib/dashboard/analytics/types";

interface FuelLineRow {
  id: string;
  invoice_id: string;
  invoice_date: string;
  invoice_number: string | null;
  product: FuelProduct;
  invoice_value: number;
  output_quantity: number;
  hsn_code: string | null;
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function pricePerLitre(value: number, quantity: number): number | null {
  if (!quantity) return null;
  return value / quantity;
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function findRank(
  rows: Array<{ month: string; value: number }>,
  mode: "highest" | "lowest"
): MonthRank | null {
  const withData = rows.filter((row) => row.value > 0);
  if (!withData.length) return null;

  const sorted = [...withData].sort((a, b) =>
    mode === "highest" ? b.value - a.value : a.value - b.value
  );
  const top = sorted[0];
  return { month: top.month, label: monthLabel(top.month), value: top.value };
}

function buildRankings(monthly: MonthlyAnalyticsRow[]): AnalyticsRankings {
  return {
    invoiceCount: {
      highest: findRank(
        monthly.map((row) => ({ month: row.month, value: row.invoiceCount })),
        "highest"
      ),
      lowest: findRank(
        monthly.map((row) => ({ month: row.month, value: row.invoiceCount })),
        "lowest"
      ),
    },
    fuelValue: {
      highest: findRank(
        monthly.map((row) => ({ month: row.month, value: row.fuelValue })),
        "highest"
      ),
      lowest: findRank(
        monthly.map((row) => ({ month: row.month, value: row.fuelValue })),
        "lowest"
      ),
    },
    quantity: {
      highest: findRank(
        monthly.map((row) => ({ month: row.month, value: row.totalQuantity })),
        "highest"
      ),
      lowest: findRank(
        monthly.map((row) => ({ month: row.month, value: row.totalQuantity })),
        "lowest"
      ),
    },
  };
}

function buildMonthlyRows(
  fuelRows: FuelLineRow[],
  monthKeys: string[]
): MonthlyAnalyticsRow[] {
  const invoiceIdsByMonth = new Map<string, Set<string>>();
  const monthStats = new Map<
    string,
    {
      fuelValue: number;
      ebmsQuantity: number;
      hsdQuantity: number;
      ebmsValue: number;
      hsdValue: number;
    }
  >();

  for (const key of monthKeys) {
    invoiceIdsByMonth.set(key, new Set());
    monthStats.set(key, {
      fuelValue: 0,
      ebmsQuantity: 0,
      hsdQuantity: 0,
      ebmsValue: 0,
      hsdValue: 0,
    });
  }

  for (const row of fuelRows) {
    const month = row.invoice_date.slice(0, 7);
    if (!monthStats.has(month)) continue;

    const stats = monthStats.get(month)!;
    stats.fuelValue += row.invoice_value;
    stats.ebmsValue += row.product === "EBMS" ? row.invoice_value : 0;
    stats.hsdValue += row.product === "HSD-BSVI" ? row.invoice_value : 0;
    stats.ebmsQuantity += row.product === "EBMS" ? row.output_quantity : 0;
    stats.hsdQuantity += row.product === "HSD-BSVI" ? row.output_quantity : 0;
    invoiceIdsByMonth.get(month)!.add(row.invoice_id);
  }

  let cumulativeValue = 0;
  let cumulativeQuantity = 0;

  const rows: MonthlyAnalyticsRow[] = monthKeys.map((month, index) => {
    const stats = monthStats.get(month)!;
    const invoiceCount = invoiceIdsByMonth.get(month)!.size;
    const totalQuantity = stats.ebmsQuantity + stats.hsdQuantity;
    const ebmsMixPct = totalQuantity ? (stats.ebmsQuantity / totalQuantity) * 100 : 0;
    const hsdMixPct = totalQuantity ? (stats.hsdQuantity / totalQuantity) * 100 : 0;

    cumulativeValue += stats.fuelValue;
    cumulativeQuantity += totalQuantity;

    const target = getMonthlyTarget(month);

    return {
      month,
      label: monthLabel(month),
      invoiceCount,
      fuelValue: stats.fuelValue,
      ebmsQuantity: stats.ebmsQuantity,
      hsdQuantity: stats.hsdQuantity,
      totalQuantity,
      ebmsValue: stats.ebmsValue,
      hsdValue: stats.hsdValue,
      ebmsPricePerLitre: pricePerLitre(stats.ebmsValue, stats.ebmsQuantity),
      hsdPricePerLitre: pricePerLitre(stats.hsdValue, stats.hsdQuantity),
      ebmsMixPct,
      hsdMixPct,
      avgValuePerInvoice: invoiceCount ? stats.fuelValue / invoiceCount : 0,
      avgQuantityPerInvoice: invoiceCount ? totalQuantity / invoiceCount : 0,
      cumulativeValue,
      cumulativeQuantity,
      momInvoiceCountPct: null,
      momFuelValuePct: null,
      momQuantityPct: null,
      targetQuantityKl: target?.quantityKl ?? null,
      targetValue: target?.value ?? null,
      quantityVariancePct: target?.quantityKl
        ? pctChange(totalQuantity / 1000, target.quantityKl)
        : null,
      valueVariancePct: target?.value ? pctChange(stats.fuelValue, target.value) : null,
    };
  });

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const curr = rows[i];
    curr.momInvoiceCountPct = pctChange(curr.invoiceCount, prev.invoiceCount);
    curr.momFuelValuePct = pctChange(curr.fuelValue, prev.fuelValue);
    curr.momQuantityPct = pctChange(curr.totalQuantity, prev.totalQuantity);
  }

  return rows;
}

function getFyStartYearFromDate(isoDate: string): number {
  const [year, month] = isoDate.split("-").map(Number);
  return month >= 4 ? year : year - 1;
}

function buildFySummary(
  fuelRows: FuelLineRow[],
  fyLabel: string,
  dateFrom: string,
  dateTo: string
): FySummary {
  const inRange = fuelRows.filter(
    (row) => row.invoice_date >= dateFrom && row.invoice_date <= dateTo
  );
  const invoiceIds = new Set(inRange.map((row) => row.invoice_id));

  let ebmsQuantity = 0;
  let hsdQuantity = 0;
  let ebmsValue = 0;
  let hsdValue = 0;
  let fuelValue = 0;

  for (const row of inRange) {
    fuelValue += row.invoice_value;
    if (row.product === "EBMS") {
      ebmsQuantity += row.output_quantity;
      ebmsValue += row.invoice_value;
    } else {
      hsdQuantity += row.output_quantity;
      hsdValue += row.invoice_value;
    }
  }

  return {
    fyLabel,
    dateFrom,
    dateTo,
    invoiceCount: invoiceIds.size,
    fuelValue,
    totalQuantity: ebmsQuantity + hsdQuantity,
    ebmsQuantity,
    hsdQuantity,
    ebmsPricePerLitre: pricePerLitre(ebmsValue, ebmsQuantity),
    hsdPricePerLitre: pricePerLitre(hsdValue, hsdQuantity),
  };
}

function buildDayOfMonth(fuelRows: FuelLineRow[]): DayOfMonthPoint[] {
  const days = Array.from({ length: 31 }, (_, i) => ({
    day: i + 1,
    invoiceCount: 0,
    quantity: 0,
  }));
  const seen = new Map<number, Set<string>>();

  for (const row of fuelRows) {
    const day = Number(row.invoice_date.slice(8, 10));
    if (!day || day < 1 || day > 31) continue;

    if (!seen.has(day)) seen.set(day, new Set());
    seen.get(day)!.add(row.invoice_id);
    days[day - 1].quantity += row.output_quantity;
  }

  for (const point of days) {
    point.invoiceCount = seen.get(point.day)?.size ?? 0;
  }

  return days;
}

function buildExtremes(fuelRows: FuelLineRow[]): {
  largest: DispatchExtreme | null;
  smallest: DispatchExtreme | null;
} {
  if (!fuelRows.length) return { largest: null, smallest: null };

  const toExtreme = (row: FuelLineRow): DispatchExtreme => ({
    id: row.id,
    invoiceDate: row.invoice_date,
    billNo: row.invoice_number || "—",
    product: row.product,
    quantity: row.output_quantity,
    value: row.invoice_value,
    pricePerLitre: pricePerLitre(row.invoice_value, row.output_quantity),
  });

  const sorted = [...fuelRows].sort((a, b) => b.output_quantity - a.output_quantity);
  return {
    largest: toExtreme(sorted[0]),
    smallest: toExtreme(sorted[sorted.length - 1]),
  };
}

function rollingAvg(values: number[], index: number, window = 3): number | null {
  if (index < window) return null;
  const slice = values.slice(index - window, index);
  if (!slice.length) return null;
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

function buildAnomalies(monthly: MonthlyAnalyticsRow[]): AnalyticsAnomaly[] {
  const anomalies: AnalyticsAnomaly[] = [];
  const ebmsPrices = monthly.map((row) => row.ebmsPricePerLitre ?? 0);
  const hsdPrices = monthly.map((row) => row.hsdPricePerLitre ?? 0);

  monthly.forEach((row, index) => {
    if (index === 0) return;

    const prev = monthly[index - 1];
    if (prev.invoiceCount > 0 && row.invoiceCount > 0) {
      const countChange = pctChange(row.invoiceCount, prev.invoiceCount);
      if (countChange !== null && Math.abs(countChange) >= 25) {
        anomalies.push({
          month: row.month,
          label: row.label,
          severity: "info",
          message: `Invoice count ${countChange > 0 ? "up" : "down"} ${Math.abs(countChange).toFixed(1)}% vs previous month`,
        });
      }
    }

    if (prev.totalQuantity > 0 && row.totalQuantity > 0) {
      const qtyChange = pctChange(row.totalQuantity, prev.totalQuantity);
      if (qtyChange !== null && qtyChange <= -20) {
        anomalies.push({
          month: row.month,
          label: row.label,
          severity: "warning",
          message: `Fuel quantity down ${Math.abs(qtyChange).toFixed(1)}% vs previous month`,
        });
      }
    }

    const ebmsAvg = rollingAvg(ebmsPrices, index);
    if (ebmsAvg && row.ebmsPricePerLitre) {
      const change = pctChange(row.ebmsPricePerLitre, ebmsAvg);
      if (change !== null && Math.abs(change) >= 8) {
        anomalies.push({
          month: row.month,
          label: row.label,
          severity: change > 0 ? "warning" : "info",
          message: `EBMS price ${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% vs 3-month average`,
        });
      }
    }

    const hsdAvg = rollingAvg(hsdPrices, index);
    if (hsdAvg && row.hsdPricePerLitre) {
      const change = pctChange(row.hsdPricePerLitre, hsdAvg);
      if (change !== null && Math.abs(change) >= 8) {
        anomalies.push({
          month: row.month,
          label: row.label,
          severity: change > 0 ? "warning" : "info",
          message: `HSD-BSVI price ${change > 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}% vs 3-month average`,
        });
      }
    }

    if (row.targetQuantityKl && row.quantityVariancePct !== null) {
      if (row.quantityVariancePct <= -15 || row.quantityVariancePct >= 15) {
        anomalies.push({
          month: row.month,
          label: row.label,
          severity: "warning",
          message: `Quantity ${row.quantityVariancePct > 0 ? "above" : "below"} target by ${Math.abs(row.quantityVariancePct).toFixed(1)}%`,
        });
      }
    }
  });

  return anomalies.slice(-12);
}

async function loadFuelRows(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<FuelLineRow[]> {
  const invoices = await getFilteredInvoices(supabase, filters);
  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const lineItems = await getFilteredLineItems(supabase, invoiceIds, filters.product, invoices);

  const rows: FuelLineRow[] = [];
  for (const item of lineItems) {
    const product = normalizeFuelProduct(item.product);
    const invoice = invoiceMap.get(item.invoice_id);
    if (!product || !invoice?.invoice_date) continue;

    rows.push({
      id: item.id,
      invoice_id: item.invoice_id,
      invoice_date: invoice.invoice_date,
      invoice_number: invoice.invoice_number,
      product,
      invoice_value: item.invoice_value ?? 0,
      output_quantity: item.output_quantity ?? 0,
      hsn_code: item.hsn_code,
    });
  }

  return rows;
}

function buildSnapshot(
  fuelRows: FuelLineRow[],
  periodLabel: string
): AnalyticsSnapshot {
  const invoiceIds = new Set(fuelRows.map((row) => row.invoice_id));
  let fuelValue = 0;
  let ebmsQuantity = 0;
  let hsdQuantity = 0;
  let ebmsValue = 0;
  let hsdValue = 0;

  for (const row of fuelRows) {
    fuelValue += row.invoice_value;
    if (row.product === "EBMS") {
      ebmsQuantity += row.output_quantity;
      ebmsValue += row.invoice_value;
    } else {
      hsdQuantity += row.output_quantity;
      hsdValue += row.invoice_value;
    }
  }

  return {
    periodLabel,
    invoiceCount: invoiceIds.size,
    fuelValue,
    totalQuantityKl: (ebmsQuantity + hsdQuantity) / 1000,
    ebmsPricePerLitre: pricePerLitre(ebmsValue, ebmsQuantity),
    hsdPricePerLitre: pricePerLitre(hsdValue, hsdQuantity),
    ebmsQuantityKl: ebmsQuantity / 1000,
    hsdQuantityKl: hsdQuantity / 1000,
  };
}

export async function computeDashboardAnalytics(
  supabase: SupabaseClient,
  filters: DashboardFilters,
  options: {
    periodLabel: string;
    dateFrom: string;
    dateTo: string;
    view: "invoice" | "overview";
  }
): Promise<DashboardAnalytics> {
  const fuelRows = await loadFuelRows(supabase, filters);
  const monthKeys = listMonthsInPeriod(options.dateFrom, options.dateTo, filters.months);
  const monthlyAll = buildMonthlyRows(fuelRows, monthKeys);
  const completedMonthly = getCompletedMonthsForComparison(monthlyAll);
  const rankings = buildRankings(completedMonthly);
  const snapshot = buildSnapshot(fuelRows, options.periodLabel);

  const fyStartYear = getFyStartYearFromDate(options.dateTo);
  const currentFy = getFinancialYearPeriod(fyStartYear);
  const previousFy = getFinancialYearPeriod(fyStartYear - 1);

  const allRowsForFy = await loadFuelRows(supabase, {
    dateFrom: previousFy.dateFrom,
    dateTo: currentFy.dateTo,
  });

  const fyComparison = {
    current: buildFySummary(
      allRowsForFy,
      currentFy.label,
      currentFy.dateFrom,
      currentFy.dateTo
    ),
    previous: buildFySummary(
      allRowsForFy,
      previousFy.label,
      previousFy.dateFrom,
      previousFy.dateTo
    ),
  };

  let sameMonthLastYear: DashboardAnalytics["sameMonthLastYear"] = null;
  if (monthKeys.length === 1) {
    const [year, month] = monthKeys[0].split("-").map(Number);
    const prevKey = `${year - 1}-${String(month).padStart(2, "0")}`;
    const prevRange = getMonthRange(year - 1, month);
    const prevRows = await loadFuelRows(supabase, {
      ...filters,
      dateFrom: prevRange.dateFrom,
      dateTo: prevRange.dateTo,
      months: [prevKey],
    });
    sameMonthLastYear = {
      current: monthlyAll[0] ?? null,
      previousYear: buildMonthlyRows(prevRows, [prevKey])[0] ?? null,
    };
  }

  return {
    view: options.view,
    snapshot,
    rankings,
    monthly: monthlyAll,
    fyComparison,
    dayOfMonth: buildDayOfMonth(fuelRows),
    extremes: buildExtremes(fuelRows),
    anomalies: buildAnomalies(completedMonthly),
    sameMonthLastYear,
  };
}

export { monthLabel, pricePerLitre, FUEL_PRODUCTS };
