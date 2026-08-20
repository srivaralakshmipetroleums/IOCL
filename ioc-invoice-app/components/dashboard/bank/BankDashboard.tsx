"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Upload } from "lucide-react";
import { BankCharts } from "@/components/dashboard/bank/BankCharts";
import { BankKpiCards } from "@/components/dashboard/bank/BankKpiCards";
import { BankTransferBreakdown } from "@/components/dashboard/bank/BankTransferBreakdown";
import { BankLedgerTable, type BankLedgerRow } from "@/components/dashboard/bank/BankLedgerTable";
import { SectionTitle } from "@/components/dashboard/DashboardParts";
import { DashboardPeriodSelector } from "@/components/dashboard/DashboardPeriodSelector";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import type {
  BankBalancePoint,
  BankCashFlowMonth,
  BankCategoryTotal,
  BankExecutiveSummary,
  BankTransferChannelBreakdown,
  WalletCreditGrain,
  WalletCreditPoint,
  WalletMissedDay,
} from "@/lib/bank/metrics";

interface BankDashboardPayload {
  summary: BankExecutiveSummary;
  balanceTrend: BankBalancePoint[];
  cashFlow: BankCashFlowMonth[];
  categories: BankCategoryTotal[];
  transferChannels: BankTransferChannelBreakdown[];
  walletGrain: WalletCreditGrain;
  walletCredits: WalletCreditPoint[];
  walletMissedDays: WalletMissedDay[];
}

export function BankDashboard() {
  const { period, refreshDashboard, isRefreshing } = useDashboardPeriod()!;
  const queryClient = useQueryClient();
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const periodKey = [period.dateFrom, period.dateTo, period.months?.join(",") ?? ""];

  const { data, isLoading } = useQuery<BankDashboardPayload>({
    queryKey: ["bank-dashboard", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/bank?${qs}`),
  });

  const { data: transactions = [], isLoading: ledgerLoading } = useQuery<BankLedgerRow[]>({
    queryKey: ["bank-transactions", ...periodKey],
    queryFn: () => fetchDashboardJson(`/api/dashboard/bank/transactions?${qs}`),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bank/import", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Bank import failed");
      }
      return res.json();
    },
    onSuccess: (payload) => {
      const total = payload.results?.reduce(
        (sum: number, row: { transactionCount: number }) => sum + row.transactionCount,
        0
      );
      setImportMessage(
        `Imported ${payload.results?.length ?? 0} monthly statements (${total} transactions).`
      );
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("bank-") });
    },
    onError: (err: Error) => setImportMessage(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageTitle>Bank Statement Dashboard</PageTitle>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
          <DashboardPeriodSelector />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              <Upload className="h-4 w-4" />
              {importMutation.isPending ? "Importing..." : "Import statements"}
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

      {!isLoading && data?.summary.transactionCount === 0 && (
        <p className="rounded-lg border border-ioc-warning/30 bg-ioc-warning-light px-4 py-2 text-sm text-ioc-navy">
          No bank transactions in this period. The SBI current account starts in June 2020.
          Imported coverage is Jun 2020–Mar 2026. Switch the period to a financial year in that
          range.
        </p>
      )}

      <BankKpiCards summary={data?.summary} isLoading={isLoading} />

      <SectionTitle>Charts</SectionTitle>
      <BankCharts
        balanceTrend={data?.balanceTrend ?? []}
        cashFlow={data?.cashFlow ?? []}
        categories={data?.categories ?? []}
        walletCredits={data?.walletCredits ?? []}
        walletGrain={data?.walletGrain ?? "month"}
        walletMissedDays={data?.walletMissedDays ?? []}
      />

      <SectionTitle>Transfer channels</SectionTitle>
      <BankTransferBreakdown channels={data?.transferChannels} isLoading={isLoading} />

      <SectionTitle>Transaction Ledger</SectionTitle>
      <BankLedgerTable rows={transactions} isLoading={ledgerLoading} />
    </div>
  );
}
