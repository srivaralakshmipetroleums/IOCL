"use client";

import { FileText, IndianRupee, Droplets, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyINR, formatIndianNumber, formatKL, formatLakhs } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

interface KpiTrend {
  percent: number;
  label: string;
}

interface KpiCardsProps {
  isLoading: boolean;
  invoiceCount?: number;
  totalValue?: number;
  totalQuantity?: number;
  lineItemCount?: number;
  trends?: {
    invoices?: KpiTrend;
    value?: KpiTrend;
    quantity?: KpiTrend;
    lineItems?: KpiTrend;
  };
}

export function KpiCards({
  isLoading,
  invoiceCount = 0,
  totalValue = 0,
  totalQuantity = 0,
  lineItemCount = 0,
  trends,
}: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-[10px]" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Invoices",
      value: formatIndianNumber(invoiceCount),
      icon: FileText,
      iconBg: "bg-ioc-processing-light text-ioc-blue",
      trend: trends?.invoices,
    },
    {
      label: "Total Invoice Value",
      value: formatLakhs(totalValue),
      icon: IndianRupee,
      iconBg: "bg-ioc-orange-light text-ioc-orange",
      trend: trends?.value,
    },
    {
      label: "Total Quantity (Litres)",
      value: formatKL(totalQuantity),
      icon: Droplets,
      iconBg: "bg-ioc-processing-light text-ioc-mid-blue",
      trend: trends?.quantity,
    },
    {
      label: "Total Line Items",
      value: formatIndianNumber(lineItemCount),
      icon: Layers,
      iconBg: "bg-ioc-success-light text-ioc-success",
      trend: trends?.lineItems,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="ioc-card p-5">
            <div className={cn("mb-4 inline-flex rounded-full p-2.5", card.iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-ioc-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-ioc-navy md:text-[28px]">{card.value}</p>
            {card.trend && (
              <TrendIndicator percent={card.trend.percent} label={card.trend.label} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrendIndicator({ percent, label }: KpiTrend) {
  const positive = percent >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <p
      className={cn(
        "mt-2 flex items-center gap-1 text-xs font-medium",
        positive ? "text-ioc-success" : "text-ioc-error"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {positive ? "↑" : "↓"} {Math.abs(percent).toFixed(1)}% {label}
    </p>
  );
}
