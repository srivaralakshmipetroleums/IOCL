"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { LineItemsTable, type LineItemRow } from "@/components/dashboard/LineItemsTable";
import { MonthlyCountChart } from "@/components/dashboard/MonthlyCountChart";
import { ProductQuantityDonut, ProductValueBar } from "@/components/dashboard/ProductCharts";
import { RecentInvoicesTable } from "@/components/dashboard/RecentInvoicesTable";
import { TimelineCharts, QuantityTimelineChart } from "@/components/dashboard/TimelineCharts";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import {
  getCurrentMonthRange,
  getMonthRange,
  monthInputValue,
  monthLabelFromRange,
} from "@/lib/dashboard/filters";

interface DashboardSummary {
  invoiceCount: number;
  totalValue: number;
  totalQuantity: number;
  lineItemCount: number;
  avgPerInvoice: number;
}

function getPrevMonthRange(dateFrom: string) {
  const [year, month] = dateFrom.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return getMonthRange(prevYear, prevMonth);
}

function calcTrend(current: number, previous: number, vsLabel: string) {
  if (previous === 0) return undefined;
  return {
    percent: ((current - previous) / previous) * 100,
    label: vsLabel,
  };
}

export function DashboardPage() {
  const initial = getCurrentMonthRange();
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const periodCtx = useDashboardPeriod();
  const queryClient = useQueryClient();

  const qs = useMemo(() => new URLSearchParams({ dateFrom, dateTo }).toString(), [dateFrom, dateTo]);
  const prevRange = useMemo(() => getPrevMonthRange(dateFrom), [dateFrom]);
  const prevQs = useMemo(
    () => new URLSearchParams({ dateFrom: prevRange.dateFrom, dateTo: prevRange.dateTo }).toString(),
    [prevRange]
  );
  const vsLabel = `vs ${monthLabelFromRange(prevRange.dateFrom)}`;

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/summary?${qs}`).then((r) => r.json()),
  });

  const { data: prevSummary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", prevRange.dateFrom, prevRange.dateTo],
    queryFn: () => fetch(`/api/dashboard/summary?${prevQs}`).then((r) => r.json()),
  });

  const { data: valueByDate = [] } = useQuery<Array<{ date: string; value: number }>>({
    queryKey: ["dashboard-value", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/value-by-date?${qs}`).then((r) => r.json()),
  });

  const { data: quantityByDate = [] } = useQuery<Array<{ date: string; quantity: number }>>({
    queryKey: ["dashboard-qty-date", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/quantity-by-date?${qs}`).then((r) => r.json()),
  });

  const { data: productQuantity = [] } = useQuery<Array<{ product: string; quantity: number }>>({
    queryKey: ["dashboard-product-qty", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/product-quantity?${qs}`).then((r) => r.json()),
  });

  const { data: productValue = [] } = useQuery<Array<{ product: string; value: number }>>({
    queryKey: ["dashboard-product-value", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/product-value?${qs}`).then((r) => r.json()),
  });

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery<LineItemRow[]>({
    queryKey: ["dashboard-line-items", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/line-items?${qs}`).then((r) => r.json()),
  });

  function handleMonthChange(value: string) {
    if (!value) return;
    const [year, month] = value.split("-").map(Number);
    const range = getMonthRange(year, month);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    periodCtx?.setPeriodFromDate(range.dateFrom);
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-value"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-qty-date"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-product-qty"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-product-value"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-line-items"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-monthly"] });
    queryClient.invalidateQueries({ queryKey: ["recent-invoices"] });
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <PageTitle>Dashboard</PageTitle>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <div>
            <label
              htmlFor="period-month"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ioc-muted"
            >
              Period
            </label>
            <input
              id="period-month"
              type="month"
              value={monthInputValue(dateFrom)}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="rounded-[10px] border border-ioc-border bg-white px-3.5 py-2 text-sm shadow-sm outline-none focus:border-ioc-blue focus:ring-2 focus:ring-ioc-blue/20"
            />
          </div>
          <Button onClick={handleRefresh} className="w-full sm:w-auto sm:mb-0.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
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
