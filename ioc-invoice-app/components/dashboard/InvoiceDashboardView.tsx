"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { LineItemsTable, type LineItemRow } from "@/components/dashboard/LineItemsTable";
import { MonthlyCountChart } from "@/components/dashboard/MonthlyCountChart";
import { ProductQuantityDonut, ProductValueBar } from "@/components/dashboard/ProductCharts";
import { TimelineCharts, QuantityTimelineChart } from "@/components/dashboard/TimelineCharts";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { getPreviousComparisonPeriod } from "@/lib/dashboard/period";

interface DashboardSummary {
  invoiceCount: number;
  totalValue: number;
  totalQuantity: number;
  lineItemCount: number;
  avgPerInvoice: number;
}

function calcTrend(current: number, previous: number, vsLabel: string) {
  if (previous === 0) return undefined;
  return {
    percent: ((current - previous) / previous) * 100,
    label: vsLabel,
  };
}

export function InvoiceDashboardView() {
  const { period } = useDashboardPeriod()!;

  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const prevPeriod = useMemo(() => getPreviousComparisonPeriod(period), [period]);
  const prevQs = useMemo(
    () => (prevPeriod ? buildDashboardQueryString(prevPeriod) : ""),
    [prevPeriod]
  );
  const vsLabel = prevPeriod ? `vs ${prevPeriod.label}` : "";

  const { data: summary, isLoading, isError, error } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/summary?${qs}`),
  });

  const { data: prevSummary } = useQuery<DashboardSummary>({
    queryKey: [
      "dashboard-summary",
      prevPeriod?.dateFrom,
      prevPeriod?.dateTo,
      prevPeriod?.months?.join(",") ?? "",
    ],
    queryFn: () => fetchDashboardJson(`/api/dashboard/summary?${prevQs}`),
    enabled: Boolean(prevPeriod),
  });

  const { data: valueByDate = [] } = useQuery<Array<{ date: string; value: number }>>({
    queryKey: ["dashboard-value", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/value-by-date?${qs}`),
  });

  const { data: quantityByDate = [] } = useQuery<Array<{ date: string; quantity: number }>>({
    queryKey: ["dashboard-qty-date", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/quantity-by-date?${qs}`),
  });

  const { data: productQuantity = [] } = useQuery<Array<{ product: string; quantity: number }>>({
    queryKey: ["dashboard-product-qty", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/product-quantity?${qs}`),
  });

  const { data: productValue = [] } = useQuery<Array<{ product: string; value: number }>>({
    queryKey: ["dashboard-product-value", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/product-value?${qs}`),
  });

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery<LineItemRow[]>({
    queryKey: ["dashboard-line-items", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/line-items?${qs}`),
  });

  const { data: prevProductQuantity = [] } = useQuery<Array<{ product: string; quantity: number }>>({
    queryKey: [
      "dashboard-product-qty",
      prevPeriod?.dateFrom,
      prevPeriod?.dateTo,
      prevPeriod?.months?.join(",") ?? "",
    ],
    queryFn: () => fetchDashboardJson(`/api/dashboard/product-quantity?${prevQs}`),
    enabled: Boolean(prevPeriod),
  });

  const totalProductQuantity = productQuantity.reduce((sum, entry) => sum + entry.quantity, 0);
  const prevTotalProductQuantity = prevProductQuantity.reduce((sum, entry) => sum + entry.quantity, 0);

  const trends = prevSummary
    ? {
        invoices: calcTrend(summary?.invoiceCount ?? 0, prevSummary.invoiceCount, vsLabel),
        value: calcTrend(summary?.totalValue ?? 0, prevSummary.totalValue, vsLabel),
        quantity: calcTrend(summary?.totalQuantity ?? 0, prevSummary.totalQuantity, vsLabel),
        productQuantity: calcTrend(totalProductQuantity, prevTotalProductQuantity, vsLabel),
      }
    : undefined;

  return (
    <>
      {isError && (
        <div className="rounded-lg border border-ioc-error/30 bg-ioc-error-light px-4 py-3 text-sm text-ioc-error">
          Failed to load dashboard data: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {!isLoading && !isError && summary?.invoiceCount === 0 && (
        <div className="rounded-lg border border-ioc-border bg-ioc-section px-4 py-3 text-sm text-ioc-muted">
          No invoices found for <strong>{period.label}</strong>. Try <strong>Last 6 Months</strong> or
          check the <strong>Invoices</strong> page to confirm data was extracted from Gmail/upload.
        </div>
      )}

      <KpiCards
        isLoading={isLoading}
        invoiceCount={summary?.invoiceCount}
        totalValue={summary?.totalValue}
        totalQuantity={summary?.totalQuantity}
        productQuantity={productQuantity}
        trends={trends}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimelineCharts valueByDate={valueByDate} />
        </div>
        <ProductQuantityDonut quantityData={productQuantity} />
      </div>

      <ProductValueBar valueData={productValue} />

      <QuantityTimelineChart quantityByDate={quantityByDate} />

      <MonthlyCountChart />

      <SectionTitle>Fuel Line Items (EBMS & HSD-BSVI)</SectionTitle>
      <LineItemsTable items={lineItems} isLoading={lineItemsLoading} />
    </>
  );
}
