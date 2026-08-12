"use client";

import { monthLabelFromRange } from "@/lib/dashboard/filters";

interface DashboardHeaderProps {
  dateFrom: string;
}

export function DashboardHeader({ dateFrom }: DashboardHeaderProps) {
  const periodLabel = monthLabelFromRange(dateFrom);
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="-mx-6 -mt-6 mb-6 flex items-center justify-between bg-gradient-to-br from-[#1F4E79] to-[#2E75B6] px-8 py-5 text-white shadow-lg">
      <div className="text-3xl">🛢️</div>
      <div className="text-center">
        <h1 className="text-xl font-bold tracking-wide md:text-2xl">
          Indian Oil Corporation — Invoice Dashboard
        </h1>
        <p className="mt-1 text-sm opacity-75">
          Period: {periodLabel} &nbsp;|&nbsp; Generated: {generatedAt}
        </p>
      </div>
      <div className="w-8" />
    </header>
  );
}
