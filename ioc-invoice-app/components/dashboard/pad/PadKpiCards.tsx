"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Droplets,
  IndianRupee,
  PiggyBank,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCrores, formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import type { PadExecutiveSummary } from "@/lib/pad/metrics";
import { cn } from "@/lib/utils";

interface PadKpiCardsProps {
  summary?: PadExecutiveSummary;
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
        <KpiCard
          label="Opening Balance"
          value={formatCrores(s.openingBalance)}
          icon={Wallet}
          iconBg="bg-ioc-processing-light text-ioc-blue"
        />
        <KpiCard
          label="Closing Balance"
          value={formatCrores(s.closingBalance)}
          icon={Scale}
          iconBg="bg-ioc-success-light text-ioc-success"
        />
        <KpiCard
          label="Total Credits In"
          value={formatCrores(s.totalCredits)}
          icon={ArrowDownLeft}
          iconBg="bg-ioc-success-light text-ioc-success"
        />
        <KpiCard
          label="Total Debits Out"
          value={formatCrores(s.totalDebits)}
          icon={ArrowUpRight}
          iconBg="bg-ioc-orange-light text-ioc-orange"
        />
        <KpiCard
          label="Net Movement"
          value={formatCrores(s.netMovement)}
          icon={TrendingUp}
          iconBg="bg-ioc-processing-light text-ioc-mid-blue"
        />
        <KpiCard
          label="Open Delivery Value"
          value={s.openDeliveryValue != null ? formatCrores(s.openDeliveryValue) : "—"}
          icon={IndianRupee}
          iconBg="bg-ioc-warning-light text-ioc-warning"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Money Invested"
          value={formatCrores(s.moneyInvested)}
          icon={PiggyBank}
          iconBg="bg-ioc-processing-light text-ioc-blue"
        />
        <KpiCard
          label="Fuel Purchased"
          value={formatCrores(s.fuelPurchaseValue)}
          icon={Droplets}
          iconBg="bg-ioc-orange-light text-ioc-orange"
          sub={`${formatIndianNumber(s.fuelQuantityKl)} KL (MS ${formatIndianNumber(s.fuelMsKl)} / HSD ${formatIndianNumber(s.fuelHsdKl)})`}
        />
        <KpiCard
          label="Retail Revenue"
          value={formatCrores(s.retailRevenue)}
          icon={IndianRupee}
          iconBg="bg-ioc-success-light text-ioc-success"
        />
        <KpiCard
          label="Net Profit"
          value={formatCrores(s.grossPumpProfit)}
          icon={TrendingUp}
          iconBg="bg-ioc-success-light text-ioc-success"
          sub="Fuel margin + dealer margin + discounts − charges"
        />
        <KpiCard
          label="IOCL Margin"
          value={formatCrores(s.marginTotal)}
          icon={ArrowDownLeft}
          iconBg="bg-ioc-processing-light text-ioc-mid-blue"
        />
        <KpiCard
          label="Discounts"
          value={formatCrores(s.discountTotal)}
          icon={ArrowDownLeft}
          iconBg="bg-ioc-processing-light text-ioc-blue"
          sub={
            s.missingRetailPriceCount > 0
              ? `${s.missingRetailPriceCount} fuel rows missing retail price`
              : undefined
          }
        />
      </div>
    </>
  );
}

export function formatPadCurrency(value: number) {
  if (Math.abs(value) >= 10000000) return formatCrores(value);
  return formatCurrencyINR(value);
}
