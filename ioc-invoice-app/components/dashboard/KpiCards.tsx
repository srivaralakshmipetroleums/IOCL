"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyINR, formatIndianNumber, formatKL, formatLakhs } from "@/lib/dashboard/format";

interface KpiCardsProps {
  isLoading: boolean;
  invoiceCount?: number;
  totalValue?: number;
  totalQuantity?: number;
  avgPerInvoice?: number;
}

export function KpiCards({
  isLoading,
  invoiceCount = 0,
  totalValue = 0,
  totalQuantity = 0,
  avgPerInvoice = 0,
}: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Invoices",
      value: formatIndianNumber(invoiceCount),
      sub: "unique bill numbers",
    },
    {
      label: "Total Invoice Value",
      value: formatLakhs(totalValue),
      sub: "₹ for the period",
    },
    {
      label: "Total Quantity",
      value: formatKL(totalQuantity),
      sub: "Litres dispatched",
    },
    {
      label: "Avg. Invoice Value",
      value: formatCurrencyINR(avgPerInvoice),
      sub: "₹ per invoice",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border-t-4 border-[#2E75B6] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{card.label}</p>
          <p className="mt-1 text-3xl font-extrabold text-[#1F4E79]">{card.value}</p>
          <p className="mt-0.5 text-sm text-gray-500">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
