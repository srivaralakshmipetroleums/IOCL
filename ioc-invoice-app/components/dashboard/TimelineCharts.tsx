"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IOC_CHART } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import { formatDate } from "@/lib/utils";

interface TimelineChartsProps {
  valueByDate: Array<{ date: string; value: number }>;
}

function formatChartDate(date: string) {
  if (date === "unknown") return date;
  return formatDate(date);
}

function ValueLineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ioc-border bg-white px-3 py-2 text-sm shadow-ioc">
      <p className="font-medium text-ioc-navy">{label ? formatChartDate(label) : ""}</p>
      <p className="text-ioc-blue">{formatCurrencyINR(payload[0].value)}</p>
    </div>
  );
}

function QtyBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ioc-border bg-white px-3 py-2 text-sm shadow-ioc">
      <p className="font-medium text-ioc-navy">{label ? formatChartDate(label) : ""}</p>
      <p className="text-ioc-blue">{formatIndianNumber(payload[0].value)} L</p>
    </div>
  );
}

export function TimelineCharts({ valueByDate }: TimelineChartsProps) {
  const valueData = [...valueByDate]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, label: formatChartDate(d.date) }));

  return (
    <div className="ioc-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Invoice Value Over Time</h3>
      <div className="h-64">
        {valueData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={valueData}>
              <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ioc-text-secondary)" }} />
              <YAxis
                tickFormatter={formatChartLakhs}
                tick={{ fontSize: 11, fill: "var(--ioc-text-secondary)" }}
              />
              <Tooltip content={<ValueLineTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={IOC_CHART.primary}
                strokeWidth={2}
                dot={{ r: 4, fill: IOC_CHART.accent, stroke: IOC_CHART.primary, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

export function QuantityTimelineChart({
  quantityByDate,
}: {
  quantityByDate: Array<{ date: string; quantity: number }>;
}) {
  const qtyData = [...quantityByDate]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, label: formatChartDate(d.date) }));

  return (
    <div className="ioc-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Daily Quantity Dispatched (Litres)</h3>
      <div className="h-56">
        {qtyData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={qtyData}>
              <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ioc-text-secondary)" }} />
              <YAxis
                tickFormatter={(v) => `${formatIndianNumber(v)}`}
                tick={{ fontSize: 11, fill: "var(--ioc-text-secondary)" }}
              />
              <Tooltip content={<QtyBarTooltip />} />
              <Bar dataKey="quantity" fill={IOC_CHART.secondary} radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-ioc-muted">
      No data for this period
    </div>
  );
}
