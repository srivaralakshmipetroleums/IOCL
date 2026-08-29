"use client";

import { MoneyKpiValue } from "@/components/dashboard/MoneyKpiValue";
import {
  ThreeColumnRow,
  ThreeColumnTable,
  TwoColumnRow,
  TwoColumnTable,
  WideTableScroll,
} from "@/components/ui/simple-table";
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
    <TwoColumnTable>
      {rows.map((line) => {
        const bold = line.kind === "total" || line.kind === "subtotal";
        return (
          <TwoColumnRow
            key={line.label}
            label={line.label}
            value={formatAmount(line.amount, line.kind)}
            bold={bold}
          />
        );
      })}
    </TwoColumnTable>
  );
}

function PadReconciliationTable({ pad }: { pad: FuelSalesReport["padMoney"] }) {
  const rows: Array<{ label: string; amount: string; bold?: boolean }> = [
    { label: "Dealer commission", amount: formatIndianCompact(pad.dealerCommission) },
    { label: "PAD deductions", amount: formatAmount(pad.padDeductions, "deduction") },
    { label: "Other PAD charges (interest)", amount: formatAmount(pad.otherPadCharges, "deduction") },
    { label: "Net PAD contribution", amount: formatIndianCompact(pad.netPadContribution), bold: true },
  ];

  return (
    <TwoColumnTable>
      {rows.map((row) => (
        <TwoColumnRow key={row.label} label={row.label} value={row.amount} bold={row.bold} />
      ))}
    </TwoColumnTable>
  );
}

export function FuelSalesReportView({ report }: { report: FuelSalesReport }) {
  const pl = report.profitAndLoss;
  const pad = report.padMoney;

  return (
    <div className="min-w-0 space-y-8">
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
        <ThreeColumnTable
          col1Header="Particular"
          col2Header={
            <>
              <span className="sm:hidden">MS</span>
              <span className="hidden sm:inline">Petrol (MS)</span>
            </>
          }
          col3Header={
            <>
              <span className="sm:hidden">HSD</span>
              <span className="hidden sm:inline">Diesel (HSD)</span>
            </>
          }
        >
          <ThreeColumnRow
            col1="Opening stock"
            col2={formatLitres(report.stockReconciliation[0]?.openingLitres ?? null)}
            col3={formatLitres(report.stockReconciliation[1]?.openingLitres ?? null)}
          />
          <ThreeColumnRow
            col1="Purchases"
            col2={formatLitres(report.stockReconciliation[0]?.purchaseLitres ?? null)}
            col3={formatLitres(report.stockReconciliation[1]?.purchaseLitres ?? null)}
          />
          <ThreeColumnRow
            col1="Closing stock"
            col2={formatLitres(report.stockReconciliation[0]?.closingLitres ?? null)}
            col3={formatLitres(report.stockReconciliation[1]?.closingLitres ?? null)}
          />
          <ThreeColumnRow
            col1="Actual sold"
            col2={formatLitres(report.stockReconciliation[0]?.actualSoldLitres ?? null)}
            col3={formatLitres(report.stockReconciliation[1]?.actualSoldLitres ?? null)}
            bold
          />
        </ThreeColumnTable>
        <WideTableScroll className="ioc-card">
          <table className="w-full min-w-[640px] text-sm sm:min-w-0 sm:table-fixed">
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
        </WideTableScroll>
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
        <PadReconciliationTable pad={pad} />
        {pad.discount > 0 && (
          <p className="text-xs text-ioc-muted">
            IOCL incentives of {formatIndianCompact(pad.discount)} are shown as other operating
            income in the P&amp;L, not inside net PAD contribution.
          </p>
        )}
      </section>
    </div>
  );
}
