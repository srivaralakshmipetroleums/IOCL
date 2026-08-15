"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCurrentMonthPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";

interface DashboardPeriodContextValue {
  period: DashboardPeriod;
  setPeriod: (period: DashboardPeriod) => void;
  periodLabel: string;
  refreshDashboard: () => Promise<void>;
  isRefreshing: boolean;
}

const DashboardPeriodContext = createContext<DashboardPeriodContextValue | null>(null);

export function DashboardPeriodProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<DashboardPeriod>(() => getCurrentMonthPeriod());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.refetchQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return (
            key === "dashboard-summary" ||
            key === "dashboard-value" ||
            key === "dashboard-qty-date" ||
            key === "dashboard-product-qty" ||
            key === "dashboard-product-value" ||
            key === "dashboard-line-items" ||
            key === "dashboard-monthly" ||
            key === "recent-invoices"
          );
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      period,
      setPeriod,
      periodLabel: period.label,
      refreshDashboard,
      isRefreshing,
    }),
    [period, refreshDashboard, isRefreshing]
  );

  return (
    <DashboardPeriodContext.Provider value={value}>{children}</DashboardPeriodContext.Provider>
  );
}

export function useDashboardPeriod() {
  return useContext(DashboardPeriodContext);
}
