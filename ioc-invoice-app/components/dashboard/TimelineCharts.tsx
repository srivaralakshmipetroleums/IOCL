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
import { IOC_COLORS } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import { formatDate } from "@/lib/utils";

interface TimelineChartsProps {
  valueByDate: Array<{ date: string; value: number }>;
  quantityByDate: Array<{ date: string; quantity: number }>;
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
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label ? formatChartDate(label) : ""}</p>
      <p className="text-[#1F4E79]">{formatCurrencyINR(payload[0].value)}</p>
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
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label ? formatChartDate(label) : ""}</p>
      <p className="text-[#1F4E79]">{formatIndianNumber(payload[0].value)} L</p>
    </div>
  );
}

export function TimelineCharts({ valueByDate, quantityByDate }: TimelineChartsProps) {
  const valueData = valueByDate.map((d) => ({ ...d, label: formatChartDate(d.date) }));
  const qtyData = quantityByDate.map((d) => ({ ...d, label: formatChartDate(d.date) }));

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1F4E79]">
          Daily Invoice Value Over Period (₹)
        </h3>
        <div className="h-64">
          {valueData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valueData}>
                <CartesianGrid stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 11 }} />
                <Tooltip content={<ValueLineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={IOC_COLORS.blueDark}
                  strokeWidth={2}
                  dot={{ r: 5, fill: IOC_COLORS.accent, stroke: IOC_COLORS.blueDark, strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                  fill="rgba(31,78,121,0.12)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1F4E79]">
          Daily Quantity Dispatched (Litres)
        </h3>
        <div className="h-56">
          {qtyData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qtyData}>
                <CartesianGrid stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${formatIndianNumber(v)} L`} tick={{ fontSize: 11 }} />
                <Tooltip content={<QtyBarTooltip />} />
                <Bar dataKey="quantity" fill="rgba(46,117,182,0.7)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-gray-400">No data for this period</div>
  );
}
