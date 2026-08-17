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
import { IOC_CHART } from "@/lib/dashboard/constants";
import { formatChartLakhs, formatIndianNumber, formatPricePerLitre } from "@/lib/dashboard/format";
import type {
  PadBalancePoint,
  PadCashFlowMonth,
  PadChargePeriodTotal,
  PadChargeReport,
  PadCommissionMonth,
  PadFuelPurchaseMonth,
  PadGrossProfitMonth,
  PadRateTrendPoint,
} from "@/lib/pad/metrics";
import { formatPadCurrency } from "@/components/dashboard/pad/PadKpiCards";

function formatKl(value: number): string {
  return `${value.toFixed(1)} KL`;
}

function QuantityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: { msKl: number; hsdKl: number; totalKl: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-ioc-border bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-ioc-navy">{label}</p>
      <p>MS: {formatKl(row.msKl)}</p>
      <p>HSD: {formatKl(row.hsdKl)}</p>
      <p className="mt-1 font-semibold">Total: {formatKl(row.totalKl)}</p>
    </div>
  );
}

function RateTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: PadRateTrendPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-ioc-border bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-ioc-navy">{label}</p>
      <p>MS Purchase: {formatPricePerLitre(row.msPurchasePerL)}</p>
      <p>MS Retail: {formatPricePerLitre(row.msRetailPerL)}</p>
      <p className="font-medium">MS margin: {formatPricePerLitre(row.msSpreadPerL)}</p>
      <p className="mt-1">HSD Purchase: {formatPricePerLitre(row.hsdPurchasePerL)}</p>
      <p>HSD Retail: {formatPricePerLitre(row.hsdRetailPerL)}</p>
      <p className="font-medium">HSD margin: {formatPricePerLitre(row.hsdSpreadPerL)}</p>
      <p className="mt-1">MS qty: {formatKl(row.msKl)}</p>
      <p>HSD qty: {formatKl(row.hsdKl)}</p>
      <p className="font-semibold">Total: {formatKl(row.totalKl)}</p>
    </div>
  );
}

function GrossProfitTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: PadGrossProfitMonth }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-ioc-border bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold text-ioc-navy">{label}</p>
      <p>MS fuel margin: {formatPadCurrency(row.msProfit)}</p>
      <p>HSD fuel margin: {formatPadCurrency(row.hsdProfit)}</p>
      <p>Dealer margin: {formatPadCurrency(row.dealerMargin)}</p>
      {row.discount !== 0 && <p>Discounts: {formatPadCurrency(row.discount)}</p>}
      <p>Charges: −{formatPadCurrency(row.charges)}</p>
      <p className="mt-1 font-semibold">Net: {formatPadCurrency(row.netProfit)}</p>
    </div>
  );
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

const FEE_COLORS = [
  IOC_CHART.primary,
  IOC_CHART.accent,
  IOC_CHART.secondary,
  IOC_CHART.supporting,
  "#94a3b8",
  "#64748b",
];

interface PadChartsProps {
  balanceTrend: PadBalancePoint[];
  cashFlow: PadCashFlowMonth[];
  fuelPurchases: PadFuelPurchaseMonth[];
  commissions: PadCommissionMonth[];
  commissionYtd: number;
  charges: PadChargeReport;
  grossProfitByMonth: PadGrossProfitMonth[];
  rateTrend: PadRateTrendPoint[];
}

export function PadCharts({
  balanceTrend,
  cashFlow,
  fuelPurchases,
  commissions,
  commissionYtd,
  charges,
  grossProfitByMonth,
  rateTrend,
}: PadChartsProps) {
  const balanceData = balanceTrend.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  const cashFlowData = cashFlow.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  const fuelData = fuelPurchases.map((d) => ({
    ...d,
    totalKl: d.msKl + d.hsdKl,
    label: formatMonthLabel(d.month),
  }));

  const commissionData = commissions.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  const profitData = grossProfitByMonth.map((d) => ({
    ...d,
    chargesNeg: -d.charges,
    label: formatMonthLabel(d.month),
  }));

  const rateData = rateTrend.map((d) => ({
    ...d,
    label: formatMonthLabel(d.month),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">PAD Balance Over Time</h3>
          <div className="h-64">
            {balanceData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceData}>
                  <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatPadCurrency(v)} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={IOC_CHART.secondary}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-ioc-muted">No balance data for this period.</p>
            )}
          </div>
        </div>

        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">Monthly In vs Out</h3>
          <div className="h-64">
            {cashFlowData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatPadCurrency(v)} />
                  <Legend />
                  <Bar dataKey="creditsIn" name="Credits In" fill={IOC_CHART.secondary} />
                  <Bar dataKey="debitsOut" name="Debits Out" fill={IOC_CHART.accent} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-ioc-muted">No cash flow data for this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">
            MS vs HSD Quantity (KL)
            <span className="ml-2 text-xs font-normal text-ioc-muted">From invoices</span>
          </h3>
          <div className="h-64">
            {fuelData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelData}>
                  <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<QuantityTooltip />} />
                  <Legend />
                  <Bar dataKey="msKl" name="MS (KL)" stackId="qty" fill={IOC_CHART.ebms} />
                  <Bar dataKey="hsdKl" name="HSD (KL)" stackId="qty" fill={IOC_CHART.hsd} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-ioc-muted">No fuel purchase data.</p>
            )}
          </div>
        </div>

        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">
            Dealer Margin & Discounts
            <span className="ml-2 text-xs font-normal text-ioc-muted">
              YTD commission: {formatPadCurrency(commissionYtd)}
            </span>
          </h3>
          <div className="h-64">
            {commissionData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionData}>
                  <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatPadCurrency(v)} />
                  <Legend />
                  <Bar dataKey="margin" name="Margin" fill={IOC_CHART.secondary} />
                  <Bar dataKey="discount" name="Discount" fill={IOC_CHART.supporting} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-ioc-muted">No commission data.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ioc-card p-5">
          <h3 className="mb-1 text-sm font-semibold text-ioc-navy">Gross Profit by Month</h3>
          <p className="mb-4 text-xs text-ioc-muted">
            Invoice fuel margin (retail − purchase) × litres, plus PAD dealer margin and discounts,
            minus PAD charges
          </p>
          <div className="h-64">
            {profitData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitData}>
                  <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={formatChartLakhs} tick={{ fontSize: 10 }} />
                  <Tooltip content={<GrossProfitTooltip />} />
                  <Legend />
                  <Bar dataKey="msProfit" name="MS fuel" stackId="p" fill={IOC_CHART.ebms} />
                  <Bar dataKey="hsdProfit" name="HSD fuel" stackId="p" fill={IOC_CHART.hsd} />
                  <Bar dataKey="dealerMargin" name="Dealer margin" stackId="p" fill={IOC_CHART.secondary} />
                  <Bar dataKey="discount" name="Discounts" stackId="p" fill={IOC_CHART.supporting} />
                  <Bar dataKey="chargesNeg" name="Charges" stackId="p" fill={IOC_CHART.accent} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-ioc-muted">
                Add invoices and retail selling prices to see profit charts.
              </p>
            )}
          </div>
        </div>

        <div className="ioc-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-ioc-navy">
            Purchase vs Retail Rate (₹/L)
            <span className="ml-2 text-xs font-normal text-ioc-muted">
              Purchase from invoices (value ÷ litres), same as Invoice Dashboard
            </span>
          </h3>
          <div className="h-64">
            {rateData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rateData}>
                  <CartesianGrid stroke="var(--ioc-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip content={<RateTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="msPurchasePerL"
                    name="MS Purchase"
                    stroke={IOC_CHART.ebms}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="msRetailPerL"
                    name="MS Retail"
                    stroke={IOC_CHART.ebms}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="hsdPurchasePerL"
                    name="HSD Purchase"
                    stroke={IOC_CHART.hsd}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="hsdRetailPerL"
                    name="HSD Retail"
                    stroke={IOC_CHART.hsd}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-ioc-muted">No invoice purchase rate data for this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="ioc-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-ioc-navy">Charges & Penalties</h3>
        <p className="mb-4 text-xs text-ioc-muted">
          All PAD debits except Product Supply Invoice — Sales. Names from the reference column.
          Period total: {formatPadCurrency(charges.periodTotal)}
        </p>
        {charges.byType.length ? (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charges.byType}
                      dataKey="totalDebit"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name }) => name}
                    >
                      {charges.byType.map((_, i) => (
                        <Cell key={i} fill={FEE_COLORS[i % FEE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatPadCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ioc-border text-left text-ioc-muted">
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Count</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.byType.map((row) => (
                      <tr key={row.name} className="border-b border-ioc-border/60">
                        <td className="py-2 pr-4 font-medium text-ioc-navy">{row.name}</td>
                        <td className="py-2 pr-4">{formatIndianNumber(row.count)}</td>
                        <td className="py-2">{formatPadCurrency(row.totalDebit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ChargePeriodTable title="Month-wise totals" rows={charges.byMonth} formatPeriod={formatMonthLabel} />
              <ChargePeriodTable title="Year-wise totals" rows={charges.byYear} formatPeriod={(y) => y} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ioc-muted">
                Individual charges
              </h4>
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ioc-border text-left text-ioc-muted">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Reference</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.items.map((row) => (
                      <tr key={row.id} className="border-b border-ioc-border/60">
                        <td className="whitespace-nowrap py-2 pr-4">{row.date || "—"}</td>
                        <td className="py-2 pr-4 font-medium text-ioc-navy">{row.name}</td>
                        <td className="max-w-[280px] truncate py-2 pr-4 text-ioc-muted" title={row.reference}>
                          {row.reference}
                        </td>
                        <td className="py-2 text-right">{formatPadCurrency(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ioc-muted">No charges in this period.</p>
        )}
      </div>
    </div>
  );
}

function ChargePeriodTable({
  title,
  rows,
  formatPeriod,
}: {
  title: string;
  rows: PadChargePeriodTotal[];
  formatPeriod: (period: string) => string;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ioc-muted">{title}</h4>
      <div className="max-h-56 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ioc-border text-left text-ioc-muted">
              <th className="py-2 pr-4">Period</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.period} className="border-b border-ioc-border/60">
                <td className="py-2 pr-4">
                  <div className="font-medium text-ioc-navy">{formatPeriod(row.period)}</div>
                  <div className="text-xs text-ioc-muted">
                    {Object.entries(row.byName)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, amount]) => `${name} ${formatPadCurrency(amount)}`)
                      .join(" · ")}
                  </div>
                </td>
                <td className="py-2 text-right font-medium">{formatPadCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
