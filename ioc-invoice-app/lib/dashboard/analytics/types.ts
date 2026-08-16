export interface MonthRank {
  month: string;
  label: string;
  value: number;
}

export interface MonthlyAnalyticsRow {
  month: string;
  label: string;
  invoiceCount: number;
  fuelValue: number;
  ebmsQuantity: number;
  hsdQuantity: number;
  totalQuantity: number;
  ebmsValue: number;
  hsdValue: number;
  ebmsPricePerLitre: number | null;
  hsdPricePerLitre: number | null;
  ebmsMixPct: number;
  hsdMixPct: number;
  avgValuePerInvoice: number;
  avgQuantityPerInvoice: number;
  cumulativeValue: number;
  cumulativeQuantity: number;
  momInvoiceCountPct: number | null;
  momFuelValuePct: number | null;
  momQuantityPct: number | null;
  targetQuantityKl: number | null;
  targetValue: number | null;
  quantityVariancePct: number | null;
  valueVariancePct: number | null;
}

export interface FySummary {
  fyLabel: string;
  dateFrom: string;
  dateTo: string;
  invoiceCount: number;
  fuelValue: number;
  totalQuantity: number;
  ebmsQuantity: number;
  hsdQuantity: number;
  ebmsPricePerLitre: number | null;
  hsdPricePerLitre: number | null;
}

export interface DayOfMonthPoint {
  day: number;
  invoiceCount: number;
  quantity: number;
}

export interface DispatchExtreme {
  id: string;
  invoiceDate: string;
  billNo: string;
  product: string;
  quantity: number;
  value: number;
  pricePerLitre: number | null;
}

export interface AnalyticsAnomaly {
  month: string;
  label: string;
  severity: "info" | "warning";
  message: string;
}

export interface AnalyticsRankings {
  invoiceCount: { highest: MonthRank | null; lowest: MonthRank | null };
  fuelValue: { highest: MonthRank | null; lowest: MonthRank | null };
  quantity: { highest: MonthRank | null; lowest: MonthRank | null };
}

export interface AnalyticsSnapshot {
  periodLabel: string;
  invoiceCount: number;
  fuelValue: number;
  totalQuantityKl: number;
  ebmsPricePerLitre: number | null;
  hsdPricePerLitre: number | null;
  ebmsQuantityKl: number;
  hsdQuantityKl: number;
}

export interface DashboardAnalytics {
  view: "invoice" | "overview";
  snapshot: AnalyticsSnapshot;
  rankings: AnalyticsRankings;
  monthly: MonthlyAnalyticsRow[];
  fyComparison: {
    current: FySummary | null;
    previous: FySummary | null;
  };
  dayOfMonth: DayOfMonthPoint[];
  extremes: {
    largest: DispatchExtreme | null;
    smallest: DispatchExtreme | null;
  };
  anomalies: AnalyticsAnomaly[];
  sameMonthLastYear: {
    current: MonthlyAnalyticsRow | null;
    previousYear: MonthlyAnalyticsRow | null;
  } | null;
}
