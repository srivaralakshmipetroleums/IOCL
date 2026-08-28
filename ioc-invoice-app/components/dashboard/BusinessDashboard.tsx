"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Droplets, Landmark, Wallet, FileText, Scale } from "lucide-react";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { FuelSalesReportView } from "@/components/dashboard/FuelSalesReportView";
import { StockSnapshotForm } from "@/components/dashboard/StockSnapshotForm";
import { MoneyKpiValue } from "@/components/dashboard/MoneyKpiValue";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { formatCurrencyINR, formatIndianNumber, formatKL } from "@/lib/dashboard/format";
import type { BusinessDashboardPayload } from "@/lib/stock/types";
import { cn } from "@/lib/utils";

function SummaryCard({
  label,
  icon: Icon,
  iconBg,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ioc-card p-4">
      <div className={cn("mb-3 inline-flex rounded-full p-2", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-ioc-muted">{label}</p>
      {children}
    </div>
  );
}

export function BusinessDashboard() {
  const { period, refreshDashboard, isRefreshing } = useDashboardPeriod()!;
  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const periodKey = [period.dateFrom, period.dateTo, period.months?.join(",") ?? ""];

  const { data, isLoading, isError, error } = useQuery<BusinessDashboardPayload>({
    queryKey: ["business-dashboard", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/business?${qs}`),
  });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <PageTitle>Dashboard</PageTitle>
          <p className="text-sm text-ioc-muted">
            Profit &amp; loss for {period.label} — tank stock, IOCL invoices, PAD and bank.
            Amounts are shown in crores and lakhs.
          </p>
        </div>

        <div className="ioc-toolbar">
          <DashboardPeriodSelector />
          <Button onClick={() => refreshDashboard()} disabled={isRefreshing} className="w-full sm:w-auto">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-ioc-error/30 bg-ioc-error-light px-4 py-3 text-sm text-ioc-error">
          Failed to load dashboard: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      <StockSnapshotForm />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[10px]" />
          ))}
        </div>
      )}

      {data && (
        <>
          <FuelSalesReportView report={data.fuelSalesReport} />

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ioc-navy">Quick reference</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Invoice purchases" icon={FileText} iconBg="bg-ioc-blue/10 text-ioc-blue">
                <MoneyKpiValue amount={data.invoice.totalValue} />
                <p className="mt-1 text-xs text-ioc-muted">
                  {data.invoice.invoiceCount} invoices · {formatKL(data.invoice.totalQuantityLitres)}
                </p>
              </SummaryCard>

              <SummaryCard label="PAD account" icon={TrendingUpIcon} iconBg="bg-ioc-success/10 text-ioc-success">
                <MoneyKpiValue amount={data.pad.closingBalance} />
                <p className="mt-1 text-xs text-ioc-muted">
                  IOCL paid {formatCurrencyINR(data.pad.ioclPayments)}
                </p>
              </SummaryCard>

              <SummaryCard label="Bank collections" icon={Landmark} iconBg="bg-ioc-orange/10 text-ioc-orange">
                <MoneyKpiValue amount={data.bank.totalCollections} />
                <p className="mt-1 text-xs text-ioc-muted">
                  Net operating cash {formatCurrencyINR(data.bank.netOperatingCash)}
                </p>
              </SummaryCard>

              <SummaryCard label="Bank balance" icon={Wallet} iconBg="bg-ioc-navy/10 text-ioc-navy">
                <MoneyKpiValue amount={data.bank.closingBalance} />
              </SummaryCard>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-ioc-navy">Reconciliation checks</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="ioc-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ioc-navy">
                  <Scale className="h-4 w-4" />
                  Bank IOCL vs PAD payments
                </div>
                <ul className="space-y-1 text-sm text-ioc-muted">
                  <li>Matched: {data.reconciliation.bankPadIoclMatched}</li>
                  <li>Amount mismatch: {data.reconciliation.bankPadIoclMismatch}</li>
                  <li>Bank only: {data.reconciliation.bankPadIoclBankOnly}</li>
                  <li>PAD only: {data.reconciliation.bankPadIoclPadOnly}</li>
                </ul>
              </div>

              <div className="ioc-card p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ioc-navy">
                  <Droplets className="h-4 w-4" />
                  Invoice vs PAD fuel quantity
                </div>
                <p className="text-sm text-ioc-muted">
                  {data.reconciliation.invoiceVsPadKlDiff != null
                    ? `Difference: ${formatIndianNumber(Math.round(data.reconciliation.invoiceVsPadKlDiff))} litres (invoice − PAD)`
                    : "Not enough data in this period."}
                </p>
              </div>
            </div>
          </section>

          <p className="text-xs text-ioc-muted">
            Drill down:{" "}
            <Link href="/dashboard?tab=sales&salesView=invoice" className="text-ioc-blue hover:underline">
              Invoice analytics
            </Link>
            {" · "}
            <Link href="/dashboard?tab=finance&finance=pad" className="text-ioc-blue hover:underline">
              PAD account
            </Link>
            {" · "}
            <Link href="/dashboard?tab=finance&finance=bank" className="text-ioc-blue hover:underline">
              Bank
            </Link>
            {" · "}
            <Link href="/reports" className="text-ioc-blue hover:underline">
              Reports
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
