"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { LineItemsTable, type LineItemRow } from "@/components/dashboard/LineItemsTable";
import { MonthlyCountChart } from "@/components/dashboard/MonthlyCountChart";
import { ProductQuantityDonut, ProductValueBar } from "@/components/dashboard/ProductCharts";
import { RecentInvoicesTable } from "@/components/dashboard/RecentInvoicesTable";
import { TimelineCharts, QuantityTimelineChart } from "@/components/dashboard/TimelineCharts";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
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

export function DashboardPage() {
  const { period, refreshDashboard, isRefreshing } = useDashboardPeriod()!;

  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const prevPeriod = useMemo(() => getPreviousComparisonPeriod(period), [period]);
  const prevQs = useMemo(
    () => (prevPeriod ? buildDashboardQueryString(prevPeriod) : ""),
    [prevPeriod]
  );
  const vsLabel = prevPeriod ? `vs ${prevPeriod.label}` : "";

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetch(`/api/dashboard/summary?${qs}`).then((r) => r.json()),
  });

  const { data: prevSummary } = useQuery<DashboardSummary>({
    queryKey: [
      "dashboard-summary",
      prevPeriod?.dateFrom,
      prevPeriod?.dateTo,
      prevPeriod?.months?.join(",") ?? "",
    ],
    queryFn: () => fetch(`/api/dashboard/summary?${prevQs}`).then((r) => r.json()),
    enabled: Boolean(prevPeriod),
  });

  const { data: valueByDate = [] } = useQuery<Array<{ date: string; value: number }>>({
    queryKey: ["dashboard-value", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetch(`/api/dashboard/value-by-date?${qs}`).then((r) => r.json()),
  });

  const { data: quantityByDate = [] } = useQuery<Array<{ date: string; quantity: number }>>({
    queryKey: ["dashboard-qty-date", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetch(`/api/dashboard/quantity-by-date?${qs}`).then((r) => r.json()),
  });

  const { data: productQuantity = [] } = useQuery<Array<{ product: string; quantity: number }>>({
    queryKey: ["dashboard-product-qty", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetch(`/api/dashboard/product-quantity?${qs}`).then((r) => r.json()),
  });

  const { data: productValue = [] } = useQuery<Array<{ product: string; value: number }>>({
    queryKey: ["dashboard-product-value", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetch(`/api/dashboard/product-value?${qs}`).then((r) => r.json()),
  });

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery<LineItemRow[]>({
    queryKey: ["dashboard-line-items", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetch(`/api/dashboard/line-items?${qs}`).then((r) => r.json()),
  });

  const trends = prevSummary
    ? {
        invoices: calcTrend(summary?.invoiceCount ?? 0, prevSummary.invoiceCount, vsLabel),
        value: calcTrend(summary?.totalValue ?? 0, prevSummary.totalValue, vsLabel),
        quantity: calcTrend(summary?.totalQuantity ?? 0, prevSummary.totalQuantity, vsLabel),
        lineItems: calcTrend(summary?.lineItemCount ?? 0, prevSummary.lineItemCount, vsLabel),
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageTitle>Dashboard</PageTitle>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
          <DashboardPeriodSelector />
          <Button
            onClick={() => refreshDashboard()}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <KpiCards
        isLoading={isLoading}
        invoiceCount={summary?.invoiceCount}
        totalValue={summary?.totalValue}
        totalQuantity={summary?.totalQuantity}
        lineItemCount={summary?.lineItemCount}
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

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentInvoicesTable />
        <MonthlyCountChart />
      </div>

      <SectionTitle>All Line Items</SectionTitle>
      <LineItemsTable items={lineItems} isLoading={lineItemsLoading} />
    </div>
  );
}
