"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IOC_CHART, CHART_COLORS } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatCurrencyINR } from "@/lib/dashboard/format";
import type {
  BankBalancePoint,
  BankCashFlowMonth,
  BankCategoryTotal,
} from "@/lib/bank/metrics";

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

interface BankChartsProps {
  balanceTrend: BankBalancePoint[];
  cashFlow: BankCashFlowMonth[];
  categories: BankCategoryTotal[];
}

export function BankCharts({ balanceTrend, cashFlow, categories }: BankChartsProps) {
  const pieData = categories
    .map((row) => ({
      name: row.label,
      value: row.credit > row.debit ? row.credit : row.debit,
    }))
    .filter((row) => row.value > 0)
    .slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly cash flow</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlow.map((row) => ({ ...row, monthLabel: formatMonthLabel(row.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => formatCurrencyINR(Number(value))}
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend />
              <Bar dataKey="creditsIn" name="Credits" fill={IOC_CHART.secondary} />
              <Bar dataKey="debitsOut" name="Debits" fill={IOC_CHART.accent} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Collections vs IOCL payments</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlow.map((row) => ({ ...row, monthLabel: formatMonthLabel(row.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
              <Legend />
              <Bar dataKey="cashDeposits" name="Cash" fill={IOC_CHART.primary} stackId="in" />
              <Bar dataKey="digitalCollections" name="Digital" fill={IOC_CHART.secondary} stackId="in" />
              <Bar dataKey="ioclPayments" name="IOCL" fill={IOC_CHART.accent} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Closing balance trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={balanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke={IOC_CHART.primary}
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Largest categories</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
