import type { MonthlyAnalyticsRow } from "@/lib/dashboard/analytics/types";

/** Current calendar month as YYYY-MM (local time). */
export function getCurrentMonthKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Drop the in-progress current month from month-to-month comparison metrics
 * (rankings and anomaly highlights). Charts, tables, and period KPIs keep all months.
 */
export function getCompletedMonthsForComparison(
  monthly: MonthlyAnalyticsRow[],
  now = new Date()
): MonthlyAnalyticsRow[] {
  if (monthly.length <= 1) return monthly;

  const current = getCurrentMonthKey(now);
  return monthly.filter((row) => row.month !== current);
}
