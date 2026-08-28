"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { BusinessOverviewDashboard } from "@/components/dashboard/BusinessOverviewDashboard";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { DashboardViewSelector, type DashboardViewMode } from "@/components/dashboard/DashboardViewSelector";
import { InvoiceDashboardView } from "@/components/dashboard/InvoiceDashboardView";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import type { DashboardAnalytics } from "@/lib/dashboard/analytics/types";

interface DashboardPageProps {
  view: DashboardViewMode;
  onViewChange: (view: DashboardViewMode) => void;
  /** When true, view switching is handled by a parent (e.g. Home hub sub-tabs). */
  embedded?: boolean;
}

export function DashboardPage({ view, onViewChange, embedded = false }: DashboardPageProps) {
  const { period, refreshDashboard, isRefreshing } = useDashboardPeriod()!;

  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const analyticsQs = useMemo(() => {
    const params = new URLSearchParams(qs);
    params.set("view", "overview");
    params.set("periodLabel", period.label);
    return params.toString();
  }, [qs, period.label]);

  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, error: analyticsFetchError } =
    useQuery<DashboardAnalytics>({
      queryKey: [
        "dashboard-analytics",
        period.dateFrom,
        period.dateTo,
        period.months?.join(",") ?? "",
      ],
      queryFn: () => fetchDashboardJson(`/api/dashboard/analytics?${analyticsQs}`),
      enabled: view === "overview",
    });

  return (
    <div className="min-w-0 space-y-6">
      <div
        className={
          embedded
            ? "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-end"
            : "flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
        }
      >
        {!embedded && <PageTitle>Invoice</PageTitle>}

        <div className="ioc-toolbar">
          {!embedded && (
            <DashboardViewSelector value={view} onChange={onViewChange} disabled={isRefreshing} />
          )}
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

      {view === "invoice" ? (
        <InvoiceDashboardView />
      ) : (
        <BusinessOverviewDashboard
          analytics={analytics}
          isLoading={analyticsLoading}
          isError={analyticsError}
          error={analyticsFetchError}
          periodLabel={period.label}
        />
      )}
    </div>
  );
}
