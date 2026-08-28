"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IOC_CHART } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import type {
  DsrDailyVolumePoint,
  DsrGrossProfitMonth,
  DsrProductSalesSummary,
  DsrStockPoint,
  DsrTotalizerMonth,
  DsrVolumeMonth,
} from "@/lib/iras/dsr/metrics";

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function formatDayLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}`;
}

interface DsrChartsProps {
  productSalesSummary: DsrProductSalesSummary[];
  volumeByMonth: DsrVolumeMonth[];
  totalizerByMonth: DsrTotalizerMonth[];
  grossProfitByMonth: DsrGrossProfitMonth[];
  dailyVolume: DsrDailyVolumePoint[];
  stockTrend: DsrStockPoint[];
}

export function DsrCharts({
  productSalesSummary,
  volumeByMonth,
  totalizerByMonth,
  grossProfitByMonth,
  dailyVolume,
  stockTrend,
}: DsrChartsProps) {
  const productSalesData = productSalesSummary.map((row) => ({
    ...row,
    label: row.product,
  }));
  const volumeData = volumeByMonth.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));
  const totalizerData = totalizerByMonth.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));
  const profitData = grossProfitByMonth.map((row) => ({
    ...row,
    label: formatMonthLabel(row.month),
  }));
  const dailyData = dailyVolume.map((row) => ({
    ...row,
    label: formatDayLabel(row.date),
  }));
  const stockData = stockTrend.map((row) => ({
    ...row,
    label: formatDayLabel(row.date),
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="ioc-card p-4 xl:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">
          Net sales by product — tank vs totalizer vs transaction (L)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productSalesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIndianNumber(v)} />
              <Tooltip formatter={(value: number) => [`${formatIndianNumber(value)} L`, ""]} />
              <Legend />
              <Bar dataKey="tankLitres" name="Net tank" fill={IOC_CHART.ebms} radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="totalizerLitres"
                name="Net totalizer"
                fill={IOC_CHART.secondary}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="transactionLitres"
                name="Net transaction"
                fill={IOC_CHART.supporting}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly net tank sales (L)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIndianNumber(v)} />
              <Tooltip formatter={(value: number) => [`${formatIndianNumber(value)} L`, ""]} />
              <Legend />
              <Bar dataKey="msLitres" name="MS" fill={IOC_CHART.ebms} radius={[4, 4, 0, 0]} />
              <Bar dataKey="hsdLitres" name="HSD" fill={IOC_CHART.hsd} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly net totalizer sales (L)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={totalizerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIndianNumber(v)} />
              <Tooltip formatter={(value: number) => [`${formatIndianNumber(value)} L`, ""]} />
              <Legend />
              <Bar
                dataKey="msTotalizerLitres"
                name="MS totalizer"
                fill={IOC_CHART.ebms}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="hsdTotalizerLitres"
                name="HSD totalizer"
                fill={IOC_CHART.hsd}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">
          Gross profit by month (Σ daily totalizer × margin)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatChartLakhs(v)} />
              <Tooltip formatter={(value: number) => [formatChartLakhs(value), ""]} />
              <Legend />
              <Bar dataKey="msProfit" name="MS" fill={IOC_CHART.ebms} radius={[4, 4, 0, 0]} />
              <Bar dataKey="hsdProfit" name="HSD" fill={IOC_CHART.hsd} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Daily totalizer sales by product (L)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIndianNumber(v)} />
              <Tooltip formatter={(value: number) => [`${formatIndianNumber(value)} L`, ""]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="msTotalizerLitres"
                name="MS totalizer"
                stroke={IOC_CHART.ebms}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="hsdTotalizerLitres"
                name="HSD totalizer"
                stroke={IOC_CHART.hsd}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">
          Daily fuel margin by product (totalizer × spread)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatChartLakhs(v)} />
              <Tooltip formatter={(value: number) => [formatCurrencyINR(value), ""]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="msGrossProfit"
                name="MS margin"
                stroke={IOC_CHART.ebms}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="hsdGrossProfit"
                name="HSD margin"
                stroke={IOC_CHART.hsd}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Daily sales — tank, totalizer & transaction (L)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIndianNumber(v)} />
              <Tooltip formatter={(value: number) => [`${formatIndianNumber(value)} L`, ""]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="msTankLitres"
                name="MS tank"
                stroke={IOC_CHART.ebms}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="msTotalizerLitres"
                name="MS totalizer"
                stroke={IOC_CHART.ebms}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="msTransactionLitres"
                name="MS transaction"
                stroke={IOC_CHART.ebms}
                strokeDasharray="2 2"
                dot={false}
              />
              <Line type="monotone" dataKey="hsdTankLitres" name="HSD tank" stroke={IOC_CHART.hsd} dot={false} />
              <Line
                type="monotone"
                dataKey="hsdTotalizerLitres"
                name="HSD totalizer"
                stroke={IOC_CHART.hsd}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="hsdTransactionLitres"
                name="HSD transaction"
                stroke={IOC_CHART.hsd}
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4 xl:col-span-2">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Closing stock trend (L)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ioc-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIndianNumber(v)} />
              <Tooltip formatter={(value: number) => [`${formatIndianNumber(value)} L`, ""]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="msStock"
                name="MS stock"
                stroke={IOC_CHART.ebms}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="hsdStock"
                name="HSD stock"
                stroke={IOC_CHART.hsd}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
