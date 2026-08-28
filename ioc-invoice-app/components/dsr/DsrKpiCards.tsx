"use client";

import { Droplets, Fuel, IndianRupee, LineChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyKpiValue } from "@/components/dashboard/MoneyKpiValue";
import { formatIndianNumber, formatMoneyKpi } from "@/lib/dashboard/format";
import type { DsrExecutiveSummary } from "@/lib/iras/dsr/metrics";
import { cn } from "@/lib/utils";

interface DsrKpiCardsProps {
  summary?: DsrExecutiveSummary;
  isLoading?: boolean;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-ioc-border/70 pt-2 first:border-t-0 first:pt-0">
      <span className="text-xs text-ioc-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-ioc-navy">{value}</span>
    </div>
  );
}

function ProductSalesCard({
  product,
  icon: Icon,
  iconBg,
  tankLitres,
  totalizerLitres,
  transactionLitres,
  avgDailyTotalizerLitres,
  avgDailyGrossProfit,
}: {
  product: "MS" | "HSD";
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  tankLitres: number;
  totalizerLitres: number;
  transactionLitres: number;
  avgDailyTotalizerLitres: number | null;
  avgDailyGrossProfit: number | null;
}) {
  const label = product === "MS" ? "Petrol (MS)" : "Diesel (HSD)";

  return (
    <div className="ioc-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("inline-flex rounded-full p-2", iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ioc-navy">{label}</p>
          <p className="text-xs text-ioc-muted">Net sales (litres)</p>
        </div>
      </div>
      <div className="space-y-2">
        <MetricRow label="Net tank sales" value={`${formatIndianNumber(tankLitres)} L`} />
        <MetricRow label="Net totalizer sales" value={`${formatIndianNumber(totalizerLitres)} L`} />
        <MetricRow
          label="Net transaction sales"
          value={`${formatIndianNumber(transactionLitres)} L`}
        />
        <MetricRow
          label="Avg daily totalizer"
          value={
            avgDailyTotalizerLitres != null
              ? `${formatIndianNumber(avgDailyTotalizerLitres)} L/day`
              : "—"
          }
        />
        <MetricRow
          label="Avg daily margin"
          value={
            avgDailyGrossProfit != null
              ? formatMoneyKpi(avgDailyGrossProfit).primary
              : "—"
          }
        />
      </div>
    </div>
  );
}

function SideKpiCard({
  label,
  icon: Icon,
  iconBg,
  children,
  sub,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="ioc-card p-4">
      <div className={cn("mb-3 inline-flex rounded-full p-2", iconBg)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-ioc-muted">{label}</p>
      {children}
      {sub && <p className="mt-1 text-xs text-ioc-muted">{sub}</p>}
    </div>
  );
}

export function DsrKpiCards({ summary, isLoading }: DsrKpiCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-56 rounded-[10px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <ProductSalesCard
        product="MS"
        icon={Fuel}
        iconBg="bg-ioc-processing-light text-ioc-navy"
        tankLitres={summary.totalMsTankLitres}
        totalizerLitres={summary.totalMsTotalizerLitres}
        transactionLitres={summary.totalMsTransactionLitres}
        avgDailyTotalizerLitres={summary.avgDailyMsTotalizerLitres}
        avgDailyGrossProfit={summary.avgDailyMsGrossProfit}
      />
      <ProductSalesCard
        product="HSD"
        icon={Droplets}
        iconBg="bg-ioc-orange-light text-[#C77700]"
        tankLitres={summary.totalHsdTankLitres}
        totalizerLitres={summary.totalHsdTotalizerLitres}
        transactionLitres={summary.totalHsdTransactionLitres}
        avgDailyTotalizerLitres={summary.avgDailyHsdTotalizerLitres}
        avgDailyGrossProfit={summary.avgDailyHsdGrossProfit}
      />
      <SideKpiCard label="Fuel margin" icon={IndianRupee} iconBg="bg-ioc-success-light text-ioc-success">
        <MoneyKpiValue amount={summary.totalGrossProfit} />
        <p className="mt-1 text-xs text-ioc-muted">
          MS {formatMoneyKpi(summary.totalMsGrossProfit).primary} · HSD{" "}
          {formatMoneyKpi(summary.totalHsdGrossProfit).primary}
        </p>
        <p className="mt-1 text-xs text-ioc-muted">
          Sum of daily totalizer L × (RSP − invoice purchase rate) per product
        </p>
      </SideKpiCard>
      <SideKpiCard label="Data coverage" icon={LineChart} iconBg="bg-ioc-processing-light text-ioc-mid-blue">
        <p className="mt-1 text-xl font-bold text-ioc-navy md:text-2xl">
          {summary.daysCaptured}/{summary.expectedDays}
        </p>
        <p className="mt-1 text-xs text-ioc-muted">
          {summary.coveragePct}% captured
          {summary.missingDays > 0 ? ` · ${summary.missingDays} missing` : ""}
        </p>
        <p className="mt-1 text-xs text-ioc-muted">
          Avg{" "}
          {summary.avgDailyTotalizerLitres != null
            ? `${formatIndianNumber(summary.avgDailyTotalizerLitres)} L/day`
            : "—"}{" "}
          totalizer
        </p>
      </SideKpiCard>
    </div>
  );
}
