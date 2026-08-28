"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { DsrCharts } from "@/components/dsr/DsrCharts";
import { DsrKpiCards } from "@/components/dsr/DsrKpiCards";
import { DsrLedgerTable } from "@/components/dsr/DsrLedgerTable";
import { DsrReceiptReconciliationTable } from "@/components/dsr/DsrReceiptReconciliationTable";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import type {
  DsrDailyVolumePoint,
  DsrExecutiveSummary,
  DsrGrossProfitMonth,
  DsrProductSalesSummary,
  DsrStockPoint,
  DsrTotalizerMonth,
  DsrVolumeMonth,
} from "@/lib/iras/dsr/metrics";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type {
  DsrReceiptReconciliationRow,
  DsrReceiptReconciliationSummary,
} from "@/lib/iras/dsr/receipt-reconciliation";

interface DsrDashboardPayload {
  summary: DsrExecutiveSummary;
  productSalesSummary: DsrProductSalesSummary[];
  volumeByMonth: DsrVolumeMonth[];
  totalizerByMonth: DsrTotalizerMonth[];
  grossProfitByMonth: DsrGrossProfitMonth[];
  dailyVolume: DsrDailyVolumePoint[];
  stockTrend: DsrStockPoint[];
  missingDates: string[];
  receiptReconciliation: {
    rows: DsrReceiptReconciliationRow[];
    summary: DsrReceiptReconciliationSummary;
  };
  records: DsrLedgerRow[];
}

export function DsrDashboard() {
  const { period, refreshDashboard, isRefreshing } = useDashboardPeriod()!;

  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const periodKey = [period.dateFrom, period.dateTo, period.months?.join(",") ?? ""];

  const { data, isLoading, isError, error } = useQuery<DsrDashboardPayload>({
    queryKey: ["dsr-dashboard", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/dsr?${qs}`),
  });

  const missingPreview = data?.missingDates.slice(0, 8) ?? [];

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <PageTitle>DSR Dashboard</PageTitle>
          <p className="mt-1 text-sm text-ioc-muted">
            IRAS daily sales report — tank/totalizer litres, stock, receipt vs invoice, and fuel
            margin (totalizer × (RSP − purchase rate)).
          </p>
        </div>

        <div className="ioc-toolbar">
          <DashboardPeriodSelector />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/iras-dsr">
                <ExternalLink className="h-4 w-4" />
                IRAS capture
              </Link>
            </Button>
            <Button onClick={() => refreshDashboard()} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {isError && (
        <p className="rounded-lg border border-ioc-warning/30 bg-ioc-warning-light px-4 py-2 text-sm text-ioc-navy">
          {error instanceof Error ? error.message : "Unable to load DSR dashboard"}
        </p>
      )}

      {!isLoading && data?.summary.daysCaptured === 0 && (
        <p className="rounded-lg border border-ioc-warning/30 bg-ioc-warning-light px-4 py-2 text-sm text-ioc-navy">
          No DSR records in this period. Use{" "}
          <Link href="/iras-dsr" className="font-medium text-ioc-blue underline">
            IRAS DSR capture
          </Link>{" "}
          to import data, then return here to view it.
        </p>
      )}

      {data && data.missingDates.length > 0 && (
        <p className="rounded-lg border border-ioc-border bg-ioc-surface/50 px-4 py-2 text-sm text-ioc-navy">
          {data.missingDates.length} day{data.missingDates.length === 1 ? "" : "s"} missing in
          this period
          {missingPreview.length > 0 ? `: ${missingPreview.join(", ")}` : ""}
          {data.missingDates.length > missingPreview.length
            ? ` and ${data.missingDates.length - missingPreview.length} more`
            : ""}
          .
        </p>
      )}

      <DsrKpiCards summary={data?.summary} isLoading={isLoading} />

      <SectionTitle>Charts</SectionTitle>
      <DsrCharts
        productSalesSummary={data?.productSalesSummary ?? []}
        volumeByMonth={data?.volumeByMonth ?? []}
        totalizerByMonth={data?.totalizerByMonth ?? []}
        grossProfitByMonth={data?.grossProfitByMonth ?? []}
        dailyVolume={data?.dailyVolume ?? []}
        stockTrend={data?.stockTrend ?? []}
      />

      <SectionTitle>Daily ledger</SectionTitle>
      <p className="mb-3 text-sm text-ioc-muted">
        All values are in litres unless noted. Gross profit per row is that day&apos;s totalizer
        litres × (RSP − invoice purchase rate) for MS or HSD. Period totals sum those daily values
        per product.
      </p>
      <DsrLedgerTable rows={data?.records ?? []} isLoading={isLoading} />

      <SectionTitle>Receipt vs invoice</SectionTitle>
      <DsrReceiptReconciliationTable
        rows={data?.receiptReconciliation.rows ?? []}
        summary={data?.receiptReconciliation.summary}
        isLoading={isLoading}
      />
    </div>
  );
}
