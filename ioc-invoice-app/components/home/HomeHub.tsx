"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HubTabBar } from "@/components/layout/HubTabBar";
import { BrandedLoader } from "@/components/brand/BrandedLoader";

type HomeTab = "overview" | "sales" | "finance" | "dsr";
type FinanceTab = "pad" | "bank";
type SalesView = "invoice" | "overview";

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

const SALES_TABS = [
  { id: "invoice", label: "Invoice dashboard" },
  { id: "overview", label: "Business overview" },
] as const;

const BusinessDashboard = dynamic(
  () =>
    import("@/components/dashboard/BusinessDashboard").then((mod) => mod.BusinessDashboard),
  { loading: () => <TabLoading label="Overview" /> }
);

const DashboardPage = dynamic(
  () => import("@/components/dashboard/DashboardPage").then((mod) => mod.DashboardPage),
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
  return <BrandedLoader label={`Loading ${label}`} />;
}

function isHomeTab(value: string | null): value is HomeTab {
  return value === "overview" || value === "sales" || value === "finance" || value === "dsr";
}

function isFinanceTab(value: string | null): value is FinanceTab {
  return value === "pad" || value === "bank";
}

function isSalesView(value: string | null): value is SalesView {
  return value === "invoice" || value === "overview";
}

function SalesTab({
  salesView,
  onSalesViewChange,
}: {
  salesView: SalesView;
  onSalesViewChange: (view: SalesView) => void;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ioc-navy">Invoice analytics</h2>
        <p className="mt-1 text-sm text-ioc-muted">
          {salesView === "invoice"
            ? "Operational charts, line items, and invoice KPIs."
            : "Executive analytics, month comparisons, price trends, and FY insights."}
        </p>
      </div>
      <HubTabBar
        tabs={[...SALES_TABS]}
        active={salesView}
        onChange={(id) => onSalesViewChange(id as SalesView)}
      />
      <DashboardPage
        embedded
        view={salesView}
        onViewChange={onSalesViewChange}
      />
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
    <div className="min-w-0 space-y-6">
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
  const salesViewParam = searchParams.get("salesView");
  const tab: HomeTab = isHomeTab(tabParam) ? tabParam : "overview";
  const financeTab: FinanceTab = isFinanceTab(financeParam) ? financeParam : "pad";
  const salesView: SalesView = isSalesView(salesViewParam) ? salesViewParam : "invoice";

  const setTab = useCallback(
    (next: HomeTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next !== "finance") params.delete("finance");
      if (next !== "sales") params.delete("salesView");
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

  const setSalesView = useCallback(
    (next: SalesView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "sales");
      params.set("salesView", next);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="min-w-0 space-y-6">
      <HubTabBar tabs={[...HOME_TABS]} active={tab} onChange={(id) => setTab(id as HomeTab)} />
      {tab === "overview" && <BusinessDashboard />}
      {tab === "sales" && (
        <SalesTab salesView={salesView} onSalesViewChange={setSalesView} />
      )}
      {tab === "finance" && (
        <FinanceTab financeTab={financeTab} onFinanceTabChange={setFinanceTab} />
      )}
      {tab === "dsr" && <DsrDashboard />}
    </div>
  );
}
