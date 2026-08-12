"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getCurrentMonthRange, monthLabelFromRange } from "@/lib/dashboard/filters";

interface DashboardPeriodContextValue {
  periodLabel: string;
  setPeriodFromDate: (dateFrom: string) => void;
}

const DashboardPeriodContext = createContext<DashboardPeriodContextValue | null>(null);

export function DashboardPeriodProvider({ children }: { children: ReactNode }) {
  const initial = getCurrentMonthRange();
  const [periodLabel, setPeriodLabel] = useState(initial.monthLabel);

  const value = useMemo(
    () => ({
      periodLabel,
      setPeriodFromDate: (dateFrom: string) => setPeriodLabel(monthLabelFromRange(dateFrom)),
    }),
    [periodLabel]
  );

  return (
    <DashboardPeriodContext.Provider value={value}>{children}</DashboardPeriodContext.Provider>
  );
}

export function useDashboardPeriod() {
  return useContext(DashboardPeriodContext);
}
