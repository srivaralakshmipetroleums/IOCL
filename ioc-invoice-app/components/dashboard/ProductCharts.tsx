"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";

interface ProductChartsProps {
  quantityData: Array<{ product: string; quantity: number }>;
  valueData: Array<{ product: string; value: number }>;
}

function QtyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-[#1F4E79]">{formatIndianNumber(payload[0].value)} L</p>
    </div>
  );
}

function ValueTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-[#1F4E79]">{formatCurrencyINR(payload[0].value)}</p>
    </div>
  );
}

export function ProductCharts({ quantityData, valueData }: ProductChartsProps) {
  const pieData = quantityData.map((d) => ({ name: d.product, value: d.quantity }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1F4E79]">
          Quantity by Product (Litres)
        </h3>
        <div className="h-72">
          {pieData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<QtyTooltip />} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1F4E79]">
          Invoice Value by Product (₹)
        </h3>
        <div className="h-72">
          {valueData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueData}>
                <CartesianGrid stroke="#EEF2F7" vertical={false} />
                <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 12 }} />
                <Tooltip content={<ValueTooltip />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {valueData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
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
