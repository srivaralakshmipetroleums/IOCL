"use client";

import { FileText, IndianRupee, Droplets, Layers, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIndianNumber, formatKL, formatCrores } from "@/lib/dashboard/format";
import { FUEL_PRODUCTS } from "@/lib/dashboard/fuel-products";
import { cn } from "@/lib/utils";

interface KpiTrend {
  percent: number;
  label: string;
}

interface ProductQuantityEntry {
  product: string;
  quantity: number;
}

interface KpiCardsProps {
  isLoading: boolean;
  invoiceCount?: number;
  totalValue?: number;
  totalQuantity?: number;
  productQuantity?: ProductQuantityEntry[];
  trends?: {
    invoices?: KpiTrend;
    value?: KpiTrend;
    quantity?: KpiTrend;
    productQuantity?: KpiTrend;
  };
}

function getProductQuantityBreakdown(data: ProductQuantityEntry[] = []) {
  const map = new Map(data.map((entry) => [entry.product, entry.quantity]));
  return FUEL_PRODUCTS.map((product) => ({
    product,
    quantity: map.get(product) ?? 0,
  }));
}

export function KpiCards({
  isLoading,
  invoiceCount = 0,
  totalValue = 0,
  totalQuantity = 0,
  productQuantity = [],
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

  const productBreakdown = getProductQuantityBreakdown(productQuantity);

  const cards = [
    {
      key: "invoices",
      label: "Total Invoices",
      icon: FileText,
      iconBg: "bg-ioc-processing-light text-ioc-blue",
      trend: trends?.invoices,
      content: (
        <p className="mt-1 text-2xl font-bold text-ioc-navy md:text-[28px]">
          {formatIndianNumber(invoiceCount)}
        </p>
      ),
    },
    {
      key: "value",
      label: "Total Invoice Value",
      icon: IndianRupee,
      iconBg: "bg-ioc-orange-light text-ioc-orange",
      trend: trends?.value,
      content: (
        <p className="mt-1 text-2xl font-bold text-ioc-navy md:text-[28px]">
          {formatCrores(totalValue)}
        </p>
      ),
    },
    {
      key: "quantity",
      label: "Total Quantity (Litres)",
      icon: Droplets,
      iconBg: "bg-ioc-processing-light text-ioc-mid-blue",
      trend: trends?.quantity,
      content: (
        <p className="mt-1 text-2xl font-bold text-ioc-navy md:text-[28px]">
          {formatKL(totalQuantity)}
        </p>
      ),
    },
    {
      key: "product-quantity",
      label: "Quantity by Product (KL)",
      icon: Layers,
      iconBg: "bg-ioc-success-light text-ioc-success",
      trend: trends?.productQuantity,
      content: (
        <div className="mt-2 space-y-1.5">
          {productBreakdown.map((entry) => (
            <div
              key={entry.product}
              className="flex items-baseline justify-between gap-2 text-ioc-navy"
            >
              <span className="text-sm font-medium text-ioc-muted">{entry.product}</span>
              <span className="text-lg font-bold md:text-xl">{formatKL(entry.quantity)}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="ioc-card p-5">
            <div className={cn("mb-4 inline-flex rounded-full p-2.5", card.iconBg)}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-ioc-muted">{card.label}</p>
            {card.content}
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
