"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Droplets,
  IndianRupee,
  Landmark,
  Receipt,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyINR, formatDashboardMoney, formatIndianNumber } from "@/lib/dashboard/format";
import { MoneyKpiValue } from "@/components/dashboard/MoneyKpiValue";
import type { PadExecutiveSummary } from "@/lib/pad/metrics";
import { cn } from "@/lib/utils";

interface PadKpiCardsProps {
  summary?: PadExecutiveSummary;
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

export function PadKpiCards({ summary, isLoading }: PadKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[10px]" />
        ))}
      </div>
    );
  }

  const s = summary!;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Opening Balance" amount={s.openingBalance} icon={Wallet} iconBg="bg-ioc-processing-light text-ioc-blue" />
        <KpiCard label="Closing Balance" amount={s.closingBalance} icon={Scale} iconBg="bg-ioc-success-light text-ioc-success" />
        <KpiCard label="Total Credits In" amount={s.totalCredits} icon={ArrowDownLeft} iconBg="bg-ioc-success-light text-ioc-success" />
        <KpiCard label="Total Debits Out" amount={s.totalDebits} icon={ArrowUpRight} iconBg="bg-ioc-orange-light text-ioc-orange" />
        <KpiCard label="Net Movement" amount={s.netMovement} icon={TrendingUp} iconBg="bg-ioc-processing-light text-ioc-mid-blue" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="SBI Deposits"
          amount={s.moneyInvestedSbi}
          icon={Landmark}
          iconBg="bg-ioc-processing-light text-ioc-blue"
          sub="Bank transfers to IOCL (SBIN…)"
        />
        <KpiCard
          label="Fleet Card"
          amount={s.moneyInvestedFleet}
          icon={CreditCard}
          iconBg="bg-ioc-processing-light text-ioc-mid-blue"
          sub="Fleet-card postings"
        />
        <KpiCard
          label="Fuel Purchased"
          amount={s.fuelPurchaseValue}
          icon={Droplets}
          iconBg="bg-ioc-orange-light text-ioc-orange"
          sub={`${formatIndianNumber(s.fuelQuantityKl)} KL (MS ${formatIndianNumber(s.fuelMsKl)} / HSD ${formatIndianNumber(s.fuelHsdKl)})`}
        />
        <KpiCard label="Retail Revenue" amount={s.retailRevenue} icon={IndianRupee} iconBg="bg-ioc-success-light text-ioc-success" />
        <KpiCard
          label="Gross Profit"
          amount={s.grossPumpProfit}
          icon={TrendingUp}
          iconBg="bg-ioc-success-light text-ioc-success"
          sub="Fuel margin + dealer margin + discounts − charges"
        />
        <KpiCard label="YVR464-dealer margin" amount={s.marginTotal} icon={ArrowDownLeft} iconBg="bg-ioc-processing-light text-ioc-mid-blue" />
        <KpiCard
          label="Discounts"
          amount={s.discountTotal}
          icon={ArrowDownLeft}
          iconBg="bg-ioc-processing-light text-ioc-blue"
          sub={
            s.missingRetailPriceCount > 0
              ? `${s.missingRetailPriceCount} fuel rows missing retail price`
              : undefined
          }
        />
        <KpiCard
          label="Charges"
          amount={s.feesTotal}
          icon={Receipt}
          iconBg="bg-ioc-orange-light text-ioc-orange"
          sub="Licence, rental, interest, penalties, etc."
        />
      </div>
    </>
  );
}

export function formatPadCurrency(value: number) {
  if (Math.abs(value) >= 10000000) return formatDashboardMoney(value);
  return formatCurrencyINR(value);
}
