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
import { IOC_CHART, productChartColor } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";

interface ProductChartsProps {
  quantityData: Array<{ product: string; quantity: number }>;
  valueData: Array<{ product: string; value: number }>;
}

function QtyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ioc-border bg-white px-3 py-2 text-sm shadow-ioc">
      <p className="font-medium text-ioc-navy">{payload[0].name}</p>
      <p className="text-ioc-blue">{formatIndianNumber(payload[0].value)} L</p>
    </div>
  );
}

function ValueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ioc-border bg-white px-3 py-2 text-sm shadow-ioc">
      <p className="font-medium text-ioc-navy">{payload[0].name}</p>
      <p className="text-ioc-blue">{formatCurrencyINR(payload[0].value)}</p>
    </div>
  );
}

export function ProductQuantityDonut({
  quantityData,
}: {
  quantityData: Array<{ product: string; quantity: number }>;
}) {
  const pieData = quantityData.map((d) => ({ name: d.product, value: d.quantity }));
  const totalQty = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="ioc-card flex h-full flex-col p-5">
      <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Quantity by Product (Litres)</h3>
      <div className="min-h-[280px] flex-1">
        {pieData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={productChartColor(entry.name, i)}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<QtyTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={48}
                formatter={(value: string) => {
                  const item = pieData.find((d) => d.name === value);
                  const pct = item && totalQty ? ((item.value / totalQty) * 100).toFixed(1) : "0";
                  return `${value} (${pct}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

export function ProductValueBar({
  valueData,
}: {
  valueData: Array<{ product: string; value: number }>;
}) {
  return (
    <div className="ioc-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Invoice Value by Product (₹)</h3>
      <div className="h-72">
        {valueData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={valueData}>
              <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
              <XAxis dataKey="product" tick={{ fontSize: 12, fill: "var(--ioc-text-secondary)" }} />
              <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 12, fill: "var(--ioc-text-secondary)" }} />
              <Tooltip content={<ValueTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {valueData.map((entry, i) => (
                  <Cell key={entry.product} fill={productChartColor(entry.product, i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </div>
    </div>
  );
}

/** @deprecated Use ProductQuantityDonut + ProductValueBar */
export function ProductCharts({ quantityData, valueData }: ProductChartsProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ProductQuantityDonut quantityData={quantityData} />
      <ProductValueBar valueData={valueData} />
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
