"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Upload } from "lucide-react";
import { PadCharts } from "@/components/dashboard/pad/PadCharts";
import { PadKpiCards } from "@/components/dashboard/pad/PadKpiCards";
import { PadLedgerTable, type PadLedgerRow } from "@/components/dashboard/pad/PadLedgerTable";
import { PadReconciliationTable } from "@/components/dashboard/pad/PadReconciliationTable";
import { RetailPriceManager } from "@/components/dashboard/pad/RetailPriceManager";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import type {
  PadBalancePoint,
  PadCashFlowMonth,
  PadChargeReport,
  PadCommissionMonth,
  PadExecutiveSummary,
  PadFuelPurchaseMonth,
  PadGrossProfitMonth,
  PadRateTrendPoint,
} from "@/lib/pad/metrics";
import type { PadReconciliationRow } from "@/lib/pad/reconciliation";

export function PadAccountDashboard() {
  const { period, refreshDashboard, isRefreshing } = useDashboardPeriod()!;
  const queryClient = useQueryClient();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const periodKey = [period.dateFrom, period.dateTo, period.months?.join(",") ?? ""];

  const { data: summary, isLoading: summaryLoading } = useQuery<PadExecutiveSummary>({
    queryKey: ["pad-summary", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/summary?${qs}`),
  });

  const { data: balanceTrend = [] } = useQuery<PadBalancePoint[]>({
    queryKey: ["pad-balance", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/balance-trend?${qs}`),
  });

  const { data: cashFlow = [] } = useQuery<PadCashFlowMonth[]>({
    queryKey: ["pad-cash-flow", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/cash-flow?${qs}`),
  });

  const { data: fuelPurchases = [] } = useQuery<PadFuelPurchaseMonth[]>({
    queryKey: ["pad-fuel-purchases", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/fuel-purchases?${qs}`),
  });

  const { data: commissionsData } = useQuery<{
    byMonth: PadCommissionMonth[];
    ytdTotal: number;
  }>({
    queryKey: ["pad-commissions", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/commissions?${qs}`),
  });

  const { data: charges } = useQuery<PadChargeReport>({
    queryKey: ["pad-charges", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/charges?${qs}`),
  });

  const { data: fuelProfitData } = useQuery<{
    grossProfitByMonth: PadGrossProfitMonth[];
    rateTrend: PadRateTrendPoint[];
  }>({
    queryKey: ["pad-fuel-profit", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/fuel-profit?${qs}`),
  });

  const { data: transactions = [], isLoading: ledgerLoading } = useQuery<PadLedgerRow[]>({
    queryKey: ["pad-transactions", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/transactions?${qs}`),
  });

  const { data: reconciliationData, isLoading: reconLoading } = useQuery<{
    rows: PadReconciliationRow[];
    summary: {
      total: number;
      matched: number;
      padOnly: number;
      invoiceOnly: number;
      mismatches: number;
    };
  }>({
    queryKey: ["pad-reconciliation", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/pad/reconciliation?${qs}`),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/pad/import", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "PAD import failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const total = data.results?.reduce(
        (sum: number, r: { transactionCount: number }) => sum + r.transactionCount,
        0
      );
      setImportMessage(`Imported ${data.results?.length ?? 0} statements (${total} transactions).`);
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("pad-") });
    },
    onError: (err: Error) => setImportMessage(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageTitle>Account Dashboard</PageTitle>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
          <DashboardPeriodSelector />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              <Upload className="h-4 w-4" />
              {importMutation.isPending ? "Importing..." : "Import PAD"}
            </Button>
            <Button onClick={() => refreshDashboard()} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {importMessage && (
        <p className="rounded-lg border border-ioc-border bg-ioc-surface/50 px-4 py-2 text-sm text-ioc-navy">
          {importMessage}
        </p>
      )}

      {summary && summary.missingRetailPriceCount > 0 && (
        <p className="rounded-lg border border-ioc-warning/30 bg-ioc-warning-light px-4 py-2 text-sm text-ioc-warning">
          {summary.missingRetailPriceCount} fuel supply rows have no retail price before their sale
          date. Add prices below to include them in profit totals.
        </p>
      )}

      <PadKpiCards summary={summary} isLoading={summaryLoading} />

      <SectionTitle>Charts</SectionTitle>
      <PadCharts
        balanceTrend={balanceTrend}
        cashFlow={cashFlow}
        fuelPurchases={fuelPurchases}
        commissions={commissionsData?.byMonth ?? []}
        commissionYtd={commissionsData?.ytdTotal ?? 0}
        charges={
          charges ?? { byType: [], byMonth: [], byYear: [], items: [], periodTotal: 0 }
        }
        grossProfitByMonth={fuelProfitData?.grossProfitByMonth ?? []}
        rateTrend={fuelProfitData?.rateTrend ?? []}
      />

      <SectionTitle>Transaction Ledger</SectionTitle>
      <PadLedgerTable rows={transactions} isLoading={ledgerLoading} />

      <SectionTitle>Invoice Reconciliation</SectionTitle>
      <PadReconciliationTable
        rows={reconciliationData?.rows ?? []}
        summary={reconciliationData?.summary}
        isLoading={reconLoading}
      />

      <SectionTitle>Retail Prices</SectionTitle>
      <RetailPriceManager />
    </div>
  );
}
