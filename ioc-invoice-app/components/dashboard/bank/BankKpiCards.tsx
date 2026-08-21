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
import { formatCurrencyINR, formatMoneyKpi } from "@/lib/dashboard/format";
import { MoneyKpiValue } from "@/components/dashboard/MoneyKpiValue";
import type { BankExecutiveSummary } from "@/lib/bank/metrics";
import { cn } from "@/lib/utils";

interface BankKpiCardsProps {
  summary?: BankExecutiveSummary;
  isLoading?: boolean;
}

function KpiCard({
  label,
  amount,
  icon: Icon,
  iconBg,
  sub,
  children,
}: {
  label: string;
  amount?: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ioc-card p-4">
      <div className={cn("mb-3 inline-flex rounded-full p-2", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-ioc-muted">{label}</p>
      {children ?? (amount != null ? <MoneyKpiValue amount={amount} /> : null)}
      {sub && <p className="mt-1 text-xs text-ioc-muted">{sub}</p>}
    </div>
  );
}

function formatKpiSubAmount(value: number) {
  return formatMoneyKpi(value).fullAmount ?? formatCurrencyINR(value);
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
        <KpiCard label="Opening Balance" amount={summary.openingBalance} icon={Wallet} iconBg="bg-ioc-processing-light text-ioc-blue" />
        <KpiCard label="Closing Balance" amount={summary.closingBalance} icon={Scale} iconBg="bg-ioc-success-light text-ioc-success" />
        <KpiCard label="Total Credits In" amount={summary.totalCredits} icon={ArrowDownLeft} iconBg="bg-ioc-success-light text-ioc-success" />
        <KpiCard label="Total Debits Out" amount={summary.totalDebits} icon={ArrowUpRight} iconBg="bg-ioc-orange-light text-ioc-orange" />
        <KpiCard label="Net Movement" amount={summary.netMovement} icon={TrendingUp} iconBg="bg-ioc-processing-light text-ioc-mid-blue" />
        <KpiCard label="Transactions" icon={Landmark} iconBg="bg-ioc-processing-light text-ioc-navy">
          <p className="mt-1 text-xl font-bold text-ioc-navy md:text-2xl">
            {summary.transactionCount.toLocaleString("en-IN")}
          </p>
        </KpiCard>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Cash Deposits" amount={summary.cashDeposits} icon={Banknote} iconBg="bg-ioc-success-light text-ioc-success" sub="Pump cash banked" />
        <KpiCard label="PhonePe" amount={summary.phonePe} icon={Smartphone} iconBg="bg-ioc-processing-light text-ioc-blue" sub="YESB NEFT · PhonePe Limited" />
        <KpiCard label="Paytm" amount={summary.paytm} icon={Smartphone} iconBg="bg-sky-100 text-sky-800" sub="YESB NEFT · One97" />
        <KpiCard label="Card Settlements" amount={summary.cardSettlements} icon={CreditCard} iconBg="bg-ioc-processing-light text-ioc-mid-blue" sub="Bulk posting credits" />
        <KpiCard label="POS cards" amount={summary.posCards} icon={CreditCard} iconBg="bg-indigo-100 text-indigo-800" sub="Credit/debit card on POS" />
        <KpiCard label="UPI In" amount={summary.upiIn} icon={Smartphone} iconBg="bg-ioc-processing-light text-ioc-navy" />
        <KpiCard label="IOCL Payments" amount={summary.ioclPayments} icon={Landmark} iconBg="bg-ioc-orange-light text-ioc-orange" sub="RTGS/NEFT to IOCL" />
        <KpiCard
          label="Bank Charges"
          amount={summary.bankCharges}
          icon={Receipt}
          iconBg="bg-ioc-orange-light text-ioc-orange"
          sub={`Salary ${formatKpiSubAmount(summary.salary)}`}
        />
      </div>
    </>
  );
}
