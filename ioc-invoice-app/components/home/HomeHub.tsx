"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { HubTabBar } from "@/components/layout/HubTabBar";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type HomeTab = "overview" | "sales" | "finance" | "dsr";
type FinanceTab = "pad" | "bank";

const HOME_TABS = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales" },
  { id: "finance", label: "Finance" },
  { id: "dsr", label: "DSR" },
] as const;

const FINANCE_TABS = [
  { id: "pad", label: "PAD account" },
  { id: "bank", label: "Bank" },
] as const;

const BusinessDashboard = dynamic(
  () =>
    import("@/components/dashboard/BusinessDashboard").then((mod) => mod.BusinessDashboard),
  { loading: () => <TabLoading label="Overview" /> }
);

const InvoiceDashboardView = dynamic(
  () =>
    import("@/components/dashboard/InvoiceDashboardView").then((mod) => mod.InvoiceDashboardView),
  { loading: () => <TabLoading label="Sales" /> }
);

const PadAccountDashboard = dynamic(
  () =>
    import("@/components/dashboard/pad/PadAccountDashboard").then(
      (mod) => mod.PadAccountDashboard
    ),
  { loading: () => <TabLoading label="PAD account" /> }
);

const BankDashboard = dynamic(
  () => import("@/components/dashboard/bank/BankDashboard").then((mod) => mod.BankDashboard),
  { loading: () => <TabLoading label="Bank" /> }
);

const DsrDashboard = dynamic(
  () => import("@/components/dsr/DsrDashboard").then((mod) => mod.DsrDashboard),
  { loading: () => <TabLoading label="DSR" /> }
);

function TabLoading({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ioc-muted">Loading {label}…</p>
      <Skeleton className="h-40 rounded-[10px]" />
      <Skeleton className="h-64 rounded-[10px]" />
    </div>
  );
}

function isHomeTab(value: string | null): value is HomeTab {
  return value === "overview" || value === "sales" || value === "finance" || value === "dsr";
}

function isFinanceTab(value: string | null): value is FinanceTab {
  return value === "pad" || value === "bank";
}

function InvoiceSalesTab() {
  const { refreshDashboard, isRefreshing } = useDashboardPeriod()!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ioc-navy">Invoice analytics</h2>
          <p className="text-sm text-ioc-muted">
            Operational charts, line items, and invoice KPIs for the selected period.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
          <DashboardPeriodSelector />
          <Button
            onClick={() => refreshDashboard()}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>
      <InvoiceDashboardView />
    </div>
  );
}

function FinanceTab({
  financeTab,
  onFinanceTabChange,
}: {
  financeTab: FinanceTab;
  onFinanceTabChange: (tab: FinanceTab) => void;
}) {
  return (
    <div className="space-y-6">
      <HubTabBar
        tabs={[...FINANCE_TABS]}
        active={financeTab}
        onChange={(id) => onFinanceTabChange(id as FinanceTab)}
      />
      {financeTab === "pad" ? <PadAccountDashboard /> : <BankDashboard />}
    </div>
  );
}

export function HomeHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const financeParam = searchParams.get("finance");
  const tab: HomeTab = isHomeTab(tabParam) ? tabParam : "overview";
  const financeTab: FinanceTab = isFinanceTab(financeParam) ? financeParam : "pad";

  const setTab = useCallback(
    (next: HomeTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next !== "finance") params.delete("finance");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const setFinanceTab = useCallback(
    (next: FinanceTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "finance");
      params.set("finance", next);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="space-y-6">
      <HubTabBar tabs={[...HOME_TABS]} active={tab} onChange={(id) => setTab(id as HomeTab)} />
      {tab === "overview" && <BusinessDashboard />}
      {tab === "sales" && <InvoiceSalesTab />}
      {tab === "finance" && (
        <FinanceTab financeTab={financeTab} onFinanceTabChange={setFinanceTab} />
      )}
      {tab === "dsr" && <DsrDashboard />}
    </div>
  );
}
