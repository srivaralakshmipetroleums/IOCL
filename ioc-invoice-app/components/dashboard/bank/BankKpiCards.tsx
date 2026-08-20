"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CreditCard,
  Landmark,
  Receipt,
  Scale,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCrores, formatCurrencyINR } from "@/lib/dashboard/format";
import type { BankExecutiveSummary } from "@/lib/bank/metrics";
import { cn } from "@/lib/utils";

interface BankKpiCardsProps {
  summary?: BankExecutiveSummary;
  isLoading?: boolean;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconBg,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  sub?: string;
}) {
  return (
    <div className="ioc-card p-4">
      <div className={cn("mb-3 inline-flex rounded-full p-2", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-ioc-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-ioc-navy md:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-ioc-muted">{sub}</p>}
    </div>
  );
}

function formatKpi(value: number) {
  if (Math.abs(value) >= 10000000) return formatCrores(value);
  return formatCurrencyINR(value);
}

export function BankKpiCards({ summary, isLoading }: BankKpiCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[10px]" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Opening Balance"
          value={formatKpi(summary.openingBalance)}
          icon={Wallet}
          iconBg="bg-ioc-processing-light text-ioc-blue"
        />
        <KpiCard
          label="Closing Balance"
          value={formatKpi(summary.closingBalance)}
          icon={Scale}
          iconBg="bg-ioc-success-light text-ioc-success"
        />
        <KpiCard
          label="Total Credits In"
          value={formatKpi(summary.totalCredits)}
          icon={ArrowDownLeft}
          iconBg="bg-ioc-success-light text-ioc-success"
        />
        <KpiCard
          label="Total Debits Out"
          value={formatKpi(summary.totalDebits)}
          icon={ArrowUpRight}
          iconBg="bg-ioc-orange-light text-ioc-orange"
        />
        <KpiCard
          label="Net Movement"
          value={formatKpi(summary.netMovement)}
          icon={TrendingUp}
          iconBg="bg-ioc-processing-light text-ioc-mid-blue"
        />
        <KpiCard
          label="Transactions"
          value={summary.transactionCount.toLocaleString("en-IN")}
          icon={Landmark}
          iconBg="bg-ioc-processing-light text-ioc-navy"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Cash Deposits"
          value={formatKpi(summary.cashDeposits)}
          icon={Banknote}
          iconBg="bg-ioc-success-light text-ioc-success"
          sub="Pump cash banked"
        />
        <KpiCard
          label="PhonePe / Paytm"
          value={formatKpi(summary.phonePe)}
          icon={Smartphone}
          iconBg="bg-ioc-processing-light text-ioc-blue"
        />
        <KpiCard
          label="Card Settlements"
          value={formatKpi(summary.cardSettlements)}
          icon={CreditCard}
          iconBg="bg-ioc-processing-light text-ioc-mid-blue"
          sub="Bulk posting credits"
        />
        <KpiCard
          label="POS cards"
          value={formatKpi(summary.posCards)}
          icon={CreditCard}
          iconBg="bg-indigo-100 text-indigo-800"
          sub="Credit/debit card on POS"
        />
        <KpiCard
          label="UPI In"
          value={formatKpi(summary.upiIn)}
          icon={Smartphone}
          iconBg="bg-ioc-processing-light text-ioc-navy"
        />
        <KpiCard
          label="IOCL Payments"
          value={formatKpi(summary.ioclPayments)}
          icon={Landmark}
          iconBg="bg-ioc-orange-light text-ioc-orange"
          sub="RTGS/NEFT to IOCL"
        />
        <KpiCard
          label="Bank Charges"
          value={formatKpi(summary.bankCharges)}
          icon={Receipt}
          iconBg="bg-ioc-orange-light text-ioc-orange"
          sub={`Salary ${formatKpi(summary.salary)}`}
        />
      </div>
    </>
  );
}
