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
import { TwoColumnRow, TwoColumnTable } from "@/components/ui/simple-table";
import type {
  BankBalancePoint,
  BankCashFlowMonth,
  BankCategoryTotal,
  WalletCreditGrain,
  WalletCreditPoint,
  WalletMissedDay,
} from "@/lib/bank/metrics";

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

function formatPeriodLabel(period: string, grain: WalletCreditGrain) {
  if (grain === "month") return formatMonthLabel(period);
  const [, month, day] = period.split("-");
  return `${Number(day)}/${Number(month)}`;
}

interface BankChartsProps {
  balanceTrend: BankBalancePoint[];
  cashFlow: BankCashFlowMonth[];
  categories: BankCategoryTotal[];
  walletCredits: WalletCreditPoint[];
  walletGrain: WalletCreditGrain;
  walletMissedDays: WalletMissedDay[];
}

const PHONEPE_COLOR = "#5f259f";
const PAYTM_COLOR = "#00baf2";

export function BankCharts({
  balanceTrend,
  cashFlow,
  categories,
  walletCredits,
  walletGrain,
  walletMissedDays,
}: BankChartsProps) {
  const pieData = categories
    .map((row) => ({
      name: row.label,
      value: row.credit > row.debit ? row.credit : row.debit,
    }))
    .filter((row) => row.value > 0)
    .slice(0, 8);

  return (
    <>
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

    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className="ioc-card p-4 lg:col-span-2">
        <h3 className="mb-1 text-sm font-semibold text-ioc-navy">
          PhonePe vs Paytm credits ({walletGrain === "day" ? "day-wise" : "month-wise"})
        </h3>
        <p className="mb-4 text-xs text-ioc-muted">
          PhonePe: YESB NEFT · PhonePe Limited. Paytm: YESB NEFT · One97 / PAYTM (later statements).
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={walletCredits.map((row) => ({
                ...row,
                periodLabel: formatPeriodLabel(row.period, walletGrain),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} minTickGap={12} />
              <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrencyINR(Number(value))} />
              <Legend />
              <Bar dataKey="phonePe" name="PhonePe" fill={PHONEPE_COLOR} />
              <Bar dataKey="paytm" name="Paytm" fill={PAYTM_COLOR} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ioc-card p-4">
        <h3 className="mb-1 text-sm font-semibold text-ioc-navy">Missed wallet days</h3>
        <p className="mb-3 text-xs text-ioc-muted">
          Days with other credits but no PhonePe and/or Paytm. Paytm is checked only from 25 Jun
          2025 when regular settlements started.
        </p>
        {walletMissedDays.length === 0 ? (
          <p className="text-sm text-ioc-muted">No missed days in this period.</p>
        ) : (
          <div className="max-h-72 overflow-auto text-sm">
            <TwoColumnTable labelHeader="Date" valueHeader="Flags" card={false}>
              {walletMissedDays.map((row) => (
                <TwoColumnRow
                  key={row.date}
                  label={row.date}
                  value={
                    <span className="flex flex-wrap justify-end gap-1">
                      {row.missedPhonePe && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800">
                          No PhonePe
                        </span>
                      )}
                      {row.missedPaytm && (
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">
                          No Paytm
                        </span>
                      )}
                    </span>
                  }
                />
              ))}
            </TwoColumnTable>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
