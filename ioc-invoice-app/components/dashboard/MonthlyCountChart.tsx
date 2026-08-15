"use client";

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

  const chartData = data.slice(-7).map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <div className="ioc-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly Invoice Count</h3>
      <div className="h-64">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-ioc-muted">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-ioc-muted">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ioc-text-secondary)" }} />
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
