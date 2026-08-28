import { fillMonthsInPeriod } from "@/lib/dashboard/filters";
import { roundMoney } from "@/lib/dashboard/format";
import {
  countCalendarDays,
  listIsoDatesInRange,
  normalizeDsrRecord,
  type DsrLedgerRow,
} from "@/lib/iras/dsr/normalize";
import type { DsrStoredRecordEntry } from "@/lib/iras/dsr/query-helpers";

export interface DsrExecutiveSummary {
  totalMsTankLitres: number;
  totalHsdTankLitres: number;
  totalMsTotalizerLitres: number;
  totalHsdTotalizerLitres: number;
  totalMsTransactionLitres: number;
  totalHsdTransactionLitres: number;
  totalMsGrossProfit: number;
  totalHsdGrossProfit: number;
  totalGrossProfit: number;
  msSharePct: number | null;
  daysCaptured: number;
  expectedDays: number;
  coveragePct: number;
  missingDays: number;
  peakDay: { date: string; litres: number } | null;
  avgDailyTotalizerLitres: number | null;
  avgDailyMsTotalizerLitres: number | null;
  avgDailyHsdTotalizerLitres: number | null;
  avgDailyMsGrossProfit: number | null;
  avgDailyHsdGrossProfit: number | null;
}

export interface DsrVolumeMonth {
  month: string;
  msLitres: number;
  hsdLitres: number;
  totalLitres: number;
}

export interface DsrTotalizerMonth {
  month: string;
  msTotalizerLitres: number;
  hsdTotalizerLitres: number;
  msTransactionLitres: number;
  hsdTransactionLitres: number;
}

export interface DsrGrossProfitMonth {
  month: string;
  msProfit: number;
  hsdProfit: number;
  totalProfit: number;
}

export interface DsrDailyVolumePoint {
  date: string;
  msTankLitres: number;
  hsdTankLitres: number;
  msTotalizerLitres: number;
  hsdTotalizerLitres: number;
  msTransactionLitres: number;
  hsdTransactionLitres: number;
  msGrossProfit: number;
  hsdGrossProfit: number;
}

export interface DsrProductSalesSummary {
  product: "MS" | "HSD";
  tankLitres: number;
  totalizerLitres: number;
  transactionLitres: number;
}

export interface DsrStockPoint {
  date: string;
  msStock: number | null;
  hsdStock: number | null;
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function buildDsrLedgerRows(entries: DsrStoredRecordEntry[]): DsrLedgerRow[] {
  const rows: DsrLedgerRow[] = [];
  for (const entry of entries) {
    const row = normalizeDsrRecord(entry.record, entry.product, entry.dsrDate);
    if (row) rows.push(row);
  }
  return rows;
}

export function computeDsrExecutiveSummary(
  rows: DsrLedgerRow[],
  dateFrom: string,
  dateTo: string
): DsrExecutiveSummary {
  let totalMsTankLitres = 0;
  let totalHsdTankLitres = 0;
  let totalMsTotalizerLitres = 0;
  let totalHsdTotalizerLitres = 0;
  let totalMsTransactionLitres = 0;
  let totalHsdTransactionLitres = 0;
  let totalMsGrossProfit = 0;
  let totalHsdGrossProfit = 0;
  const capturedDates = new Set<string>();
  const msSalesDays = new Set<string>();
  const hsdSalesDays = new Set<string>();
  const msProfitDays = new Set<string>();
  const hsdProfitDays = new Set<string>();
  const dailyTotals = new Map<string, number>();

  for (const row of rows) {
    capturedDates.add(row.date);
    const totalizer = row.netTotalizerSales ?? 0;
    dailyTotals.set(row.date, (dailyTotals.get(row.date) ?? 0) + totalizer);

    if (row.product === "MS") {
      totalMsTankLitres += row.netTankSales ?? 0;
      totalMsTotalizerLitres += totalizer;
      totalMsTransactionLitres += row.netTransactionSales ?? 0;
      if (totalizer > 0) msSalesDays.add(row.date);
      if (row.grossProfit != null) {
        totalMsGrossProfit += row.grossProfit;
        msProfitDays.add(row.date);
      }
    } else {
      totalHsdTankLitres += row.netTankSales ?? 0;
      totalHsdTotalizerLitres += totalizer;
      totalHsdTransactionLitres += row.netTransactionSales ?? 0;
      if (totalizer > 0) hsdSalesDays.add(row.date);
      if (row.grossProfit != null) {
        totalHsdGrossProfit += row.grossProfit;
        hsdProfitDays.add(row.date);
      }
    }
  }

  const expectedDays = countCalendarDays(dateFrom, dateTo);
  const daysCaptured = capturedDates.size;
  const totalTankLitres = totalMsTankLitres + totalHsdTankLitres;

  let peakDay: DsrExecutiveSummary["peakDay"] = null;
  for (const [date, litres] of dailyTotals) {
    if (!peakDay || litres > peakDay.litres) {
      peakDay = { date, litres: roundMoney(litres) };
    }
  }

  return {
    totalMsTankLitres: roundMoney(totalMsTankLitres),
    totalHsdTankLitres: roundMoney(totalHsdTankLitres),
    totalMsTotalizerLitres: roundMoney(totalMsTotalizerLitres),
    totalHsdTotalizerLitres: roundMoney(totalHsdTotalizerLitres),
    totalMsTransactionLitres: roundMoney(totalMsTransactionLitres),
    totalHsdTransactionLitres: roundMoney(totalHsdTransactionLitres),
    totalMsGrossProfit: roundMoney(totalMsGrossProfit),
    totalHsdGrossProfit: roundMoney(totalHsdGrossProfit),
    totalGrossProfit: roundMoney(totalMsGrossProfit + totalHsdGrossProfit),
    msSharePct:
      totalTankLitres > 0 ? roundMoney((totalMsTankLitres / totalTankLitres) * 100) : null,
    daysCaptured,
    expectedDays,
    coveragePct: expectedDays > 0 ? roundMoney((daysCaptured / expectedDays) * 100) : 0,
    missingDays: Math.max(expectedDays - daysCaptured, 0),
    peakDay,
    avgDailyTotalizerLitres:
      daysCaptured > 0
        ? roundMoney((totalMsTotalizerLitres + totalHsdTotalizerLitres) / daysCaptured)
        : null,
    avgDailyMsTotalizerLitres:
      msSalesDays.size > 0 ? roundMoney(totalMsTotalizerLitres / msSalesDays.size) : null,
    avgDailyHsdTotalizerLitres:
      hsdSalesDays.size > 0 ? roundMoney(totalHsdTotalizerLitres / hsdSalesDays.size) : null,
    avgDailyMsGrossProfit:
      msProfitDays.size > 0 ? roundMoney(totalMsGrossProfit / msProfitDays.size) : null,
    avgDailyHsdGrossProfit:
      hsdProfitDays.size > 0 ? roundMoney(totalHsdGrossProfit / hsdProfitDays.size) : null,
  };
}

export function buildDsrProductSalesSummary(
  summary: DsrExecutiveSummary
): DsrProductSalesSummary[] {
  return [
    {
      product: "MS",
      tankLitres: summary.totalMsTankLitres,
      totalizerLitres: summary.totalMsTotalizerLitres,
      transactionLitres: summary.totalMsTransactionLitres,
    },
    {
      product: "HSD",
      tankLitres: summary.totalHsdTankLitres,
      totalizerLitres: summary.totalHsdTotalizerLitres,
      transactionLitres: summary.totalHsdTransactionLitres,
    },
  ];
}

export function computeDsrVolumeByMonth(
  rows: DsrLedgerRow[],
  dateFrom: string,
  dateTo: string,
  allowedMonths?: string[]
): DsrVolumeMonth[] {
  const byMonth = new Map<string, DsrVolumeMonth>();

  for (const row of rows) {
    const month = monthKey(row.date);
    const current = byMonth.get(month) ?? {
      month,
      msLitres: 0,
      hsdLitres: 0,
      totalLitres: 0,
    };
    const litres = row.netTankSales ?? 0;
    if (row.product === "MS") current.msLitres += litres;
    else current.hsdLitres += litres;
    current.totalLitres += litres;
    byMonth.set(month, current);
  }

  const normalized = [...byMonth.values()].map((row) => ({
    ...row,
    msLitres: roundMoney(row.msLitres),
    hsdLitres: roundMoney(row.hsdLitres),
    totalLitres: roundMoney(row.totalLitres),
  }));

  return fillMonthsInPeriod(normalized, dateFrom, dateTo, allowedMonths, (month) => ({
    month,
    msLitres: 0,
    hsdLitres: 0,
    totalLitres: 0,
  }));
}

export function computeDsrTotalizerByMonth(
  rows: DsrLedgerRow[],
  dateFrom: string,
  dateTo: string,
  allowedMonths?: string[]
): DsrTotalizerMonth[] {
  const byMonth = new Map<string, DsrTotalizerMonth>();

  for (const row of rows) {
    const month = monthKey(row.date);
    const current = byMonth.get(month) ?? {
      month,
      msTotalizerLitres: 0,
      hsdTotalizerLitres: 0,
      msTransactionLitres: 0,
      hsdTransactionLitres: 0,
    };
    if (row.product === "MS") {
      current.msTotalizerLitres += row.netTotalizerSales ?? 0;
      current.msTransactionLitres += row.netTransactionSales ?? 0;
    } else {
      current.hsdTotalizerLitres += row.netTotalizerSales ?? 0;
      current.hsdTransactionLitres += row.netTransactionSales ?? 0;
    }
    byMonth.set(month, current);
  }

  const normalized = [...byMonth.values()].map((row) => ({
    month: row.month,
    msTotalizerLitres: roundMoney(row.msTotalizerLitres),
    hsdTotalizerLitres: roundMoney(row.hsdTotalizerLitres),
    msTransactionLitres: roundMoney(row.msTransactionLitres),
    hsdTransactionLitres: roundMoney(row.hsdTransactionLitres),
  }));

  return fillMonthsInPeriod(normalized, dateFrom, dateTo, allowedMonths, (month) => ({
    month,
    msTotalizerLitres: 0,
    hsdTotalizerLitres: 0,
    msTransactionLitres: 0,
    hsdTransactionLitres: 0,
  }));
}

export function computeDsrGrossProfitByMonth(rows: DsrLedgerRow[]): DsrGrossProfitMonth[] {
  const byMonth = new Map<string, DsrGrossProfitMonth>();

  for (const row of rows) {
    const month = monthKey(row.date);
    const current = byMonth.get(month) ?? {
      month,
      msProfit: 0,
      hsdProfit: 0,
      totalProfit: 0,
    };
    const profit = row.grossProfit ?? 0;
    if (row.product === "MS") current.msProfit += profit;
    else current.hsdProfit += profit;
    current.totalProfit += profit;
    byMonth.set(month, current);
  }

  return [...byMonth.values()]
    .map((row) => ({
      month: row.month,
      msProfit: roundMoney(row.msProfit),
      hsdProfit: roundMoney(row.hsdProfit),
      totalProfit: roundMoney(row.totalProfit),
    }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

export function computeDsrDailyVolume(rows: DsrLedgerRow[]): DsrDailyVolumePoint[] {
  const byDate = new Map<string, DsrDailyVolumePoint>();

  for (const row of rows) {
    const current = byDate.get(row.date) ?? {
      date: row.date,
      msTankLitres: 0,
      hsdTankLitres: 0,
      msTotalizerLitres: 0,
      hsdTotalizerLitres: 0,
      msTransactionLitres: 0,
      hsdTransactionLitres: 0,
      msGrossProfit: 0,
      hsdGrossProfit: 0,
    };
    if (row.product === "MS") {
      current.msTankLitres += row.netTankSales ?? 0;
      current.msTotalizerLitres += row.netTotalizerSales ?? 0;
      current.msTransactionLitres += row.netTransactionSales ?? 0;
      current.msGrossProfit += row.grossProfit ?? 0;
    } else {
      current.hsdTankLitres += row.netTankSales ?? 0;
      current.hsdTotalizerLitres += row.netTotalizerSales ?? 0;
      current.hsdTransactionLitres += row.netTransactionSales ?? 0;
      current.hsdGrossProfit += row.grossProfit ?? 0;
    }
    byDate.set(row.date, current);
  }

  return [...byDate.values()]
    .map((row) => ({
      ...row,
      msTankLitres: roundMoney(row.msTankLitres),
      hsdTankLitres: roundMoney(row.hsdTankLitres),
      msTotalizerLitres: roundMoney(row.msTotalizerLitres),
      hsdTotalizerLitres: roundMoney(row.hsdTotalizerLitres),
      msTransactionLitres: roundMoney(row.msTransactionLitres),
      hsdTransactionLitres: roundMoney(row.hsdTransactionLitres),
      msGrossProfit: roundMoney(row.msGrossProfit),
      hsdGrossProfit: roundMoney(row.hsdGrossProfit),
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function computeDsrStockTrend(rows: DsrLedgerRow[]): DsrStockPoint[] {
  const byDate = new Map<string, DsrStockPoint>();

  for (const row of rows) {
    const current = byDate.get(row.date) ?? {
      date: row.date,
      msStock: null,
      hsdStock: null,
    };
    if (row.product === "MS") current.msStock = row.totalStock;
    else current.hsdStock = row.totalStock;
    byDate.set(row.date, current);
  }

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function listMissingDsrDates(
  rows: DsrLedgerRow[],
  dateFrom: string,
  dateTo: string
): string[] {
  const captured = new Set(rows.map((row) => row.date));
  return listIsoDatesInRange(dateFrom, dateTo).filter((date) => !captured.has(date));
}
