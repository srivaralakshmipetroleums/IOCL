/**
 * Optional monthly targets for Business Overview "target vs actual".
 * Add entries as YYYY-MM keys when you want variance tracking.
 *
 * Example:
 * "2026-07": { quantityKl: 120, value: 15000000 },
 */
export interface MonthlyTarget {
  quantityKl?: number;
  value?: number;
}

export const MONTHLY_TARGETS: Record<string, MonthlyTarget> = {};

export function getMonthlyTarget(monthKey: string): MonthlyTarget | null {
  const target = MONTHLY_TARGETS[monthKey];
  if (!target) return null;
  return target;
}
