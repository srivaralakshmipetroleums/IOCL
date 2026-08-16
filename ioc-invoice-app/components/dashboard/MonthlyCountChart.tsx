"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { IOC_CHART } from "@/lib/dashboard/constants";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";

interface MonthlyPoint {
  month: string;
  count: number;
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function MonthlyCountChart() {
  const { period } = useDashboardPeriod()!;
  const qs = buildDashboardQueryString(period);

  const { data = [], isLoading } = useQuery<MonthlyPoint[]>({
    queryKey: ["dashboard-monthly", period.dateFrom, period.dateTo, period.months?.join(",") ?? ""],
    queryFn: () => fetchDashboardJson(`/api/dashboard/monthly-count?${qs}`),
  });

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: formatMonthLabel(d.month),
      })),
    [data]
  );

  const useAngledLabels = chartData.length > 6;

  return (
    <div className="ioc-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly Invoice Count</h3>
      <div className={useAngledLabels ? "h-72" : "h-64"}>
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-ioc-muted">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ioc-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ bottom: useAngledLabels ? 20 : 0 }}>
              <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--ioc-text-secondary)" }}
                interval={0}
                angle={useAngledLabels ? -40 : 0}
                textAnchor={useAngledLabels ? "end" : "middle"}
                height={useAngledLabels ? 56 : 30}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--ioc-text-secondary)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--ioc-border)",
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" fill={IOC_CHART.primary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
