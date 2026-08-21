"use client";

import { MoneyKpiValue } from "@/components/dashboard/MoneyKpiValue";
import { formatIndianCompact, formatIndianNumber, formatPricePerLitre } from "@/lib/dashboard/format";
import type { FuelSalesReport, ProfitLedgerLine } from "@/lib/stock/types";

function formatLitres(value: number | null): string {
  if (value == null) return "—";
  return `${formatIndianNumber(Math.round(value))} L`;
}

function formatAmount(value: number | null, kind?: ProfitLedgerLine["kind"]): string {
  if (value == null) return "—";
  const compact = formatIndianCompact(value);
  if (kind === "deduction" && value !== 0) return compact.startsWith("-") ? compact : `−${compact}`;
  if (kind === "credit" && value > 0) return `+${compact}`;
  return compact;
}

function ParticularTable({
  rows,
}: {
  rows: ProfitLedgerLine[];
}) {
  return (
    <div className="ioc-card overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-ioc-border bg-ioc-section/80 text-left text-xs uppercase tracking-wide text-ioc-muted">
            <th className="px-3 py-2.5 font-semibold">Particular</th>
            <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line) => {
            const bold = line.kind === "total" || line.kind === "subtotal";
            return (
              <tr
                key={line.label}
                className={bold ? "bg-ioc-section/60 font-semibold" : "border-b border-ioc-border/50"}
              >
                <td className="px-3 py-2.5 text-sm text-ioc-navy">{line.label}</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatAmount(line.amount, line.kind)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function FuelSalesReportView({ report }: { report: FuelSalesReport }) {
  const pl = report.profitAndLoss;
  const pad = report.padMoney;

  return (
    <div className="space-y-8">
      <section className="ioc-card p-6">
        <p className="text-sm font-medium text-ioc-muted">Net profit / loss for this period</p>
        {pl.netProfit != null ? (
          <MoneyKpiValue amount={pl.netProfit} />
        ) : (
          <p className="mt-1 text-xl font-bold text-ioc-navy">Needs opening and closing stock</p>
        )}
        <p className="mt-2 text-sm text-ioc-muted">
          From tank stock, IOCL invoices, pump selling price, PAD commission and genuine bank
          expenses. Loan credits and family transfers are not treated as sales.
        </p>
      </section>

      {report.stockNote && (
        <div className="rounded-lg border border-ioc-orange/30 bg-ioc-orange-light px-4 py-3 text-sm text-ioc-navy">
          {report.stockNote}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ioc-navy">Fuel outlet profit &amp; loss</h2>
        <ParticularTable rows={pl.lines} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ioc-navy">Stock reconciliation</h2>
        <p className="text-sm text-ioc-muted">
          Actual sold = opening stock + purchases − closing stock. Litres come from tanks and IOCL
          invoices, not from the bank.
        </p>
        <div className="ioc-card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-ioc-border bg-ioc-section/80 text-left text-xs uppercase tracking-wide text-ioc-muted">
                <th className="px-3 py-2.5 font-semibold">Particular</th>
                <th className="px-3 py-2.5 text-right font-semibold">Petrol (MS)</th>
                <th className="px-3 py-2.5 text-right font-semibold">Diesel (HSD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ioc-border/50">
                <td className="px-3 py-2.5 text-sm">Opening stock</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[0]?.openingLitres ?? null)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[1]?.openingLitres ?? null)}
                </td>
              </tr>
              <tr className="border-b border-ioc-border/50">
                <td className="px-3 py-2.5 text-sm">Purchases</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[0]?.purchaseLitres ?? null)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[1]?.purchaseLitres ?? null)}
                </td>
              </tr>
              <tr className="border-b border-ioc-border/50">
                <td className="px-3 py-2.5 text-sm">Closing stock</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[0]?.closingLitres ?? null)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[1]?.closingLitres ?? null)}
                </td>
              </tr>
              <tr className="bg-ioc-section/60 font-semibold">
                <td className="px-3 py-2.5 text-sm">Actual sold</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[0]?.actualSoldLitres ?? null)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatLitres(report.stockReconciliation[1]?.actualSoldLitres ?? null)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="ioc-card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-ioc-border bg-ioc-section/80 text-left text-xs uppercase tracking-wide text-ioc-muted">
                <th className="px-3 py-2.5 font-semibold">Fuel</th>
                <th className="px-3 py-2.5 text-right font-semibold">Sold</th>
                <th className="px-3 py-2.5 text-right font-semibold">Purchase ₹/L</th>
                <th className="px-3 py-2.5 text-right font-semibold">Pump ₹/L</th>
                <th className="px-3 py-2.5 text-right font-semibold">Sales</th>
                <th className="px-3 py-2.5 text-right font-semibold">Fuel cost</th>
                <th className="px-3 py-2.5 text-right font-semibold">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              {report.fuelGrossProfit.map((row) => {
                const bold = row.product === "TOTAL";
                return (
                  <tr
                    key={row.product}
                    className={bold ? "bg-ioc-section/60 font-semibold" : "border-b border-ioc-border/50"}
                  >
                    <td className="px-3 py-2.5 text-sm text-ioc-navy">{row.label}</td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                      {formatLitres(row.actualSoldLitres)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                      {row.purchasePerL != null ? formatPricePerLitre(row.purchasePerL) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                      {row.rspPerL != null ? formatPricePerLitre(row.rspPerL) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                      {formatAmount(row.salesValue)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                      {formatAmount(row.purchaseCost)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                      {formatAmount(row.grossProfit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ioc-navy">Bank reconciliation</h2>
        <p className="text-sm text-ioc-muted">
          Not every credit is a fuel sale. Credit customers often settle later in bulk. Loans and
          family transfers are shown separately.
        </p>
        <ParticularTable rows={report.bankReconciliation.lines} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ioc-navy">PAD reconciliation</h2>
        <div className="ioc-card overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-ioc-border bg-ioc-section/80 text-left text-xs uppercase tracking-wide text-ioc-muted">
                <th className="px-3 py-2.5 font-semibold">Particular</th>
                <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ioc-border/50">
                <td className="px-3 py-2.5 text-sm">Dealer commission</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatIndianCompact(pad.dealerCommission)}
                </td>
              </tr>
              <tr className="border-b border-ioc-border/50">
                <td className="px-3 py-2.5 text-sm">PAD deductions</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatAmount(pad.padDeductions, "deduction")}
                </td>
              </tr>
              <tr className="border-b border-ioc-border/50">
                <td className="px-3 py-2.5 text-sm">Other PAD charges (interest)</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatAmount(pad.otherPadCharges, "deduction")}
                </td>
              </tr>
              <tr className="bg-ioc-section/60 font-semibold">
                <td className="px-3 py-2.5 text-sm">Net PAD contribution</td>
                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                  {formatIndianCompact(pad.netPadContribution)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {pad.discount > 0 && (
          <p className="text-xs text-ioc-muted">
            IOCL incentives of {formatIndianCompact(pad.discount)} are shown as other operating
            income in the P&amp;L, not inside net PAD contribution.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-ioc-navy">How to read this</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ioc-muted">
          {report.ownerNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
