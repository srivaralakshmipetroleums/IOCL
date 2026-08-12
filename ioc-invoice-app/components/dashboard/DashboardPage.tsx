"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { LineItemsTable, type LineItemRow } from "@/components/dashboard/LineItemsTable";
import { ProductCharts } from "@/components/dashboard/ProductCharts";
import { TimelineCharts } from "@/components/dashboard/TimelineCharts";
import { getCurrentMonthRange, getMonthRange, monthInputValue } from "@/lib/dashboard/filters";

interface DashboardSummary {
  invoiceCount: number;
  totalValue: number;
  totalQuantity: number;
  lineItemCount: number;
  avgPerInvoice: number;
}

export function DashboardPage() {
  const initial = getCurrentMonthRange();
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);

  const qs = useMemo(() => {
    const params = new URLSearchParams({ dateFrom, dateTo });
    return params.toString();
  }, [dateFrom, dateTo]);

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/summary?${qs}`).then((r) => r.json()),
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
  }

  return (
    <div className="-mx-2 min-h-full rounded-lg bg-[#F0F4F8] px-2 pb-8">
      <DashboardHeader dateFrom={dateFrom} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <label htmlFor="period-month" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#1F4E79]">
            Select Period
          </label>
          <input
            id="period-month"
            type="month"
            value={monthInputValue(dateFrom)}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm shadow-sm outline-none focus:border-[#2E75B6] focus:ring-2 focus:ring-[#2E75B6]/20"
          />
        </div>
        {summary && (
          <p className="text-sm text-gray-500">
            {summary.lineItemCount} line items across {summary.invoiceCount} invoices
          </p>
        )}
      </div>

      <SectionTitle>Key Metrics</SectionTitle>
      <KpiCards
        isLoading={isLoading}
        invoiceCount={summary?.invoiceCount}
        totalValue={summary?.totalValue}
        totalQuantity={summary?.totalQuantity}
        avgPerInvoice={summary?.avgPerInvoice}
      />

      <SectionTitle>Product Breakdown</SectionTitle>
      <ProductCharts quantityData={productQuantity} valueData={productValue} />

      <SectionTitle>Timeline</SectionTitle>
      <TimelineCharts valueByDate={valueByDate} quantityByDate={quantityByDate} />

      <SectionTitle>All Line Items</SectionTitle>
      <LineItemsTable items={lineItems} isLoading={lineItemsLoading} />

      <footer className="mt-8 text-center text-xs text-gray-400">
        IOC Invoice Automation &nbsp;•&nbsp; Sri Varalakshmi Petroleums
      </footer>
    </div>
  );
}
