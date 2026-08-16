"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { LineItemsTable, type LineItemRow } from "@/components/dashboard/LineItemsTable";
import { IOC_CHART } from "@/lib/dashboard/constants";
import type { DashboardAnalytics, MonthRank } from "@/lib/dashboard/analytics/types";
import {
  formatChartCrores,
  formatCrores,
  formatIndianNumber,
  formatKL,
  formatPricePerLitre,
} from "@/lib/dashboard/format";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessOverviewDashboardProps {
  analytics?: DashboardAnalytics;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  periodLabel: string;
}

function RankCard({ title, highest, lowest, format }: {
  title: string;
  highest: MonthRank | null;
  lowest: MonthRank | null;
  format: (value: number) => string;
}) {
  return (
    <div className="ioc-card p-4">
      <p className="text-sm font-semibold text-ioc-navy">{title}</p>
      <div className="mt-3 space-y-2 text-sm">
        <p>
          <span className="text-ioc-success font-medium">Highest: </span>
          {highest ? `${highest.label} (${format(highest.value)})` : "—"}
        </p>
        <p>
          <span className="text-ioc-error font-medium">Lowest: </span>
          {lowest ? `${lowest.label} (${format(lowest.value)})` : "—"}
        </p>
      </div>
    </div>
  );
}

export function BusinessOverviewDashboard({
  analytics,
  isLoading,
  isError,
  error,
  periodLabel,
}: BusinessOverviewDashboardProps) {
  const { period } = useDashboardPeriod()!;
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const qs = useMemo(() => buildDashboardQueryString(period), [period]);

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery<LineItemRow[]>({
    queryKey: ["dashboard-line-items", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/line-items?${qs}`),
  });

  const filteredLineItems = useMemo(() => {
    if (!selectedMonth) return lineItems;
    return lineItems.filter((row) => row.invoice_date_iso.startsWith(selectedMonth));
  }, [lineItems, selectedMonth]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="rounded-lg border border-ioc-error/30 bg-ioc-error-light px-4 py-3 text-sm text-ioc-error">
        Failed to load business overview: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const { snapshot, rankings, monthly, fyComparison, dayOfMonth, extremes, anomalies, sameMonthLastYear } =
    analytics;

  const monthlyChart = monthly.map((row) => ({
    ...row,
    ebmsKl: row.ebmsQuantity / 1000,
    hsdKl: row.hsdQuantity / 1000,
    valueCr: row.fuelValue / 10000000,
    cumulativeKl: row.cumulativeQuantity / 1000,
    cumulativeCr: row.cumulativeValue / 10000000,
  }));

  const mixChart = monthly.map((row) => ({
    label: row.label,
    EBMS: row.ebmsMixPct,
    "HSD-BSVI": row.hsdMixPct,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-ioc-border bg-ioc-section px-4 py-3 text-sm text-ioc-muted">
        <strong className="text-ioc-navy">Business Overview</strong> for {periodLabel} — fuel analytics
        (EBMS & HSD-BSVI). Click a month row to filter line items below.
      </div>

      {snapshot.invoiceCount === 0 && (
        <div className="rounded-lg border border-ioc-border bg-ioc-section px-4 py-3 text-sm text-ioc-muted">
          No fuel invoice data for this period.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="ioc-card p-5">
          <p className="text-sm text-ioc-muted">Period Invoices</p>
          <p className="mt-1 text-2xl font-bold text-ioc-navy">{formatIndianNumber(snapshot.invoiceCount)}</p>
        </div>
        <div className="ioc-card p-5">
          <p className="text-sm text-ioc-muted">Fuel Value</p>
          <p className="mt-1 text-2xl font-bold text-ioc-navy">{formatCrores(snapshot.fuelValue)}</p>
        </div>
        <div className="ioc-card p-5">
          <p className="text-sm text-ioc-muted">Total Fuel (KL)</p>
          <p className="mt-1 text-2xl font-bold text-ioc-navy">{snapshot.totalQuantityKl.toFixed(1)} KL</p>
          <p className="mt-1 text-xs text-ioc-muted">
            EBMS {snapshot.ebmsQuantityKl.toFixed(1)} · HSD {snapshot.hsdQuantityKl.toFixed(1)}
          </p>
        </div>
        <div className="ioc-card p-5">
          <p className="text-sm text-ioc-muted">Avg Price / Litre</p>
          <p className="mt-1 text-sm font-semibold text-ioc-navy">EBMS {formatPricePerLitre(snapshot.ebmsPricePerLitre)}</p>
          <p className="text-sm font-semibold text-ioc-navy">HSD {formatPricePerLitre(snapshot.hsdPricePerLitre)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankCard title="Invoice Count" highest={rankings.invoiceCount.highest} lowest={rankings.invoiceCount.lowest} format={(v) => formatIndianNumber(v)} />
        <RankCard title="Fuel Value" highest={rankings.fuelValue.highest} lowest={rankings.fuelValue.lowest} format={(v) => formatCrores(v)} />
        <RankCard title="Fuel Quantity (L)" highest={rankings.quantity.highest} lowest={rankings.quantity.lowest} format={(v) => formatKL(v)} />
      </div>

      {fyComparison.current && fyComparison.previous && (
        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Financial Year Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ioc-border text-left text-ioc-muted">
                  <th className="py-2 pr-4">FY</th>
                  <th className="py-2 pr-4">Invoices</th>
                  <th className="py-2 pr-4">Fuel Value</th>
                  <th className="py-2 pr-4">Total KL</th>
                  <th className="py-2 pr-4">EBMS KL</th>
                  <th className="py-2 pr-4">HSD KL</th>
                  <th className="py-2 pr-4">EBMS ₹/L</th>
                  <th className="py-2">HSD ₹/L</th>
                </tr>
              </thead>
              <tbody>
                {[fyComparison.current, fyComparison.previous].map((fy) => (
                  <tr key={fy.fyLabel} className="border-b border-ioc-border">
                    <td className="py-2 pr-4 font-medium">{fy.fyLabel}</td>
                    <td className="py-2 pr-4">{formatIndianNumber(fy.invoiceCount)}</td>
                    <td className="py-2 pr-4">{formatCrores(fy.fuelValue)}</td>
                    <td className="py-2 pr-4">{(fy.totalQuantity / 1000).toFixed(1)}</td>
                    <td className="py-2 pr-4">{(fy.ebmsQuantity / 1000).toFixed(1)}</td>
                    <td className="py-2 pr-4">{(fy.hsdQuantity / 1000).toFixed(1)}</td>
                    <td className="py-2 pr-4">{formatPricePerLitre(fy.ebmsPricePerLitre)}</td>
                    <td className="py-2">{formatPricePerLitre(fy.hsdPricePerLitre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sameMonthLastYear?.current && (
        <div className="ioc-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-ioc-navy">Same Month Last Year</h3>
          <p className="text-sm text-ioc-muted">
            {sameMonthLastYear.current.label}: {formatCrores(sameMonthLastYear.current.fuelValue)}, {formatKL(sameMonthLastYear.current.totalQuantity)}
            {sameMonthLastYear.previousYear
              ? ` · Last year: ${formatCrores(sameMonthLastYear.previousYear.fuelValue)}, ${formatKL(sameMonthLastYear.previousYear.totalQuantity)}`
              : " · No data for same month last year"}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly Fuel Value</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatChartCrores} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCrores(value * 10000000)} />
                <Bar dataKey="valueCr" name="Fuel Value" fill={IOC_CHART.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly Quantity by Product (KL)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ebmsKl" name="EBMS" stackId="qty" fill={IOC_CHART.ebms} />
                <Bar dataKey="hsdKl" name="HSD-BSVI" stackId="qty" fill={IOC_CHART.hsd} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Price per Litre Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatPricePerLitre(value)} />
                <Legend />
                <Line type="monotone" dataKey="ebmsPricePerLitre" name="EBMS" stroke={IOC_CHART.ebms} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="hsdPricePerLitre" name="HSD-BSVI" stroke={IOC_CHART.hsd} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Product Mix % by Month</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixChart}>
                <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="EBMS" stackId="mix" fill={IOC_CHART.ebms} />
                <Bar dataKey="HSD-BSVI" stackId="mix" fill={IOC_CHART.hsd} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="ioc-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">FY Cumulative Running Totals</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyChart}>
              <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={formatChartCrores} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cumulativeKl" name="Cumulative KL" fill={IOC_CHART.secondary} />
              <Line yAxisId="right" type="monotone" dataKey="cumulativeCr" name="Cumulative Value (Cr)" stroke={IOC_CHART.accent} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card overflow-hidden">
        <h3 className="border-b border-ioc-border px-5 py-4 text-sm font-semibold text-ioc-navy">
          Month-on-Month Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="bg-ioc-section text-left text-xs uppercase text-ioc-muted">
                <th className="px-3 py-3">Month</th>
                <th className="px-3 py-3">Invoices</th>
                <th className="px-3 py-3">Fuel Value</th>
                <th className="px-3 py-3">Total KL</th>
                <th className="px-3 py-3">EBMS ₹/L</th>
                <th className="px-3 py-3">HSD ₹/L</th>
                <th className="px-3 py-3">Avg / Invoice</th>
                <th className="px-3 py-3">MoM Value %</th>
                <th className="px-3 py-3">Target KL</th>
                <th className="px-3 py-3">vs Target</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) => (
                <tr
                  key={row.month}
                  onClick={() => setSelectedMonth(row.month)}
                  className={`cursor-pointer border-b border-ioc-border hover:bg-ioc-section ${selectedMonth === row.month ? "bg-ioc-section" : ""}`}
                >
                  <td className="px-3 py-2.5 font-medium">{row.label}</td>
                  <td className="px-3 py-2.5">{row.invoiceCount}</td>
                  <td className="px-3 py-2.5">{formatCrores(row.fuelValue)}</td>
                  <td className="px-3 py-2.5">{(row.totalQuantity / 1000).toFixed(1)}</td>
                  <td className="px-3 py-2.5">{formatPricePerLitre(row.ebmsPricePerLitre)}</td>
                  <td className="px-3 py-2.5">{formatPricePerLitre(row.hsdPricePerLitre)}</td>
                  <td className="px-3 py-2.5">{formatCrores(row.avgValuePerInvoice)}</td>
                  <td className="px-3 py-2.5">
                    {row.momFuelValuePct == null ? "—" : `${row.momFuelValuePct.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2.5">{row.targetQuantityKl ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    {row.quantityVariancePct == null ? "—" : `${row.quantityVariancePct.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Invoice Activity by Day of Month</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfMonth}>
                <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="invoiceCount" name="Invoices" fill={IOC_CHART.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Dispatch Extremes</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-ioc-success">Largest dispatch</p>
              {extremes.largest ? (
                <p className="text-ioc-muted">
                  {extremes.largest.product} · {formatKL(extremes.largest.quantity)} · Bill {extremes.largest.billNo}
                </p>
              ) : (
                <p className="text-ioc-muted">—</p>
              )}
            </div>
            <div>
              <p className="font-medium text-ioc-error">Smallest dispatch</p>
              {extremes.smallest ? (
                <p className="text-ioc-muted">
                  {extremes.smallest.product} · {formatKL(extremes.smallest.quantity)} · Bill {extremes.smallest.billNo}
                </p>
              ) : (
                <p className="text-ioc-muted">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="ioc-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-ioc-navy">Anomaly Highlights</h3>
          <ul className="space-y-2 text-sm">
            {anomalies.map((item, index) => (
              <li
                key={`${item.month}-${index}`}
                className={item.severity === "warning" ? "text-ioc-error" : "text-ioc-muted"}
              >
                <strong>{item.label}:</strong> {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <SectionTitle>
        Fuel Line Items{selectedMonth ? ` — ${monthly.find((m) => m.month === selectedMonth)?.label ?? selectedMonth}` : ""}
      </SectionTitle>
      {selectedMonth && (
        <button
          type="button"
          onClick={() => setSelectedMonth(null)}
          className="text-sm text-ioc-blue underline"
        >
          Clear month filter
        </button>
      )}
      <LineItemsTable items={filteredLineItems} isLoading={lineItemsLoading} />
    </div>
  );
}
