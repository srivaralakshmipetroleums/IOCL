"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import type {
  DsrReceiptReconciliationRow,
  DsrReceiptReconciliationSummary,
} from "@/lib/iras/dsr/receipt-reconciliation";
import { Button } from "@/components/ui/button";
import { WideTableScroll } from "@/components/ui/simple-table";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<DsrReceiptReconciliationRow["status"], string> = {
  matched: "Matched",
  mismatch: "Mismatch",
  dsr_only: "DSR receipt only",
  invoice_only: "Invoice only",
  no_receipt: "No receipt",
};

const STATUS_STYLES: Record<DsrReceiptReconciliationRow["status"], string> = {
  matched: "bg-ioc-success-light text-ioc-success",
  mismatch: "bg-red-100 text-red-700",
  dsr_only: "bg-ioc-orange-light text-[#C77700]",
  invoice_only: "bg-blue-100 text-blue-800",
  no_receipt: "bg-gray-100 text-gray-700",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-ioc-border/70 bg-ioc-surface/30 px-3 py-2">
      <p className="text-xs text-ioc-muted">{label}</p>
      <p className="text-lg font-semibold text-ioc-navy">{value}</p>
    </div>
  );
}

interface DsrReceiptReconciliationTableProps {
  rows: DsrReceiptReconciliationRow[];
  summary?: DsrReceiptReconciliationSummary;
  isLoading?: boolean;
}

export function DsrReceiptReconciliationTable({
  rows,
  summary,
  isLoading,
}: DsrReceiptReconciliationTableProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const monthsInView = useMemo(() => {
    const keys = new Set<string>();
    for (const row of filtered) {
      keys.add(row.date.slice(0, 7));
    }
    return [...keys].sort();
  }, [filtered]);

  useEffect(() => {
    setPageIndex(0);
  }, [monthsInView, statusFilter]);

  const safePageIndex = monthsInView.length ? Math.min(pageIndex, monthsInView.length - 1) : 0;
  const activeMonth = monthsInView[safePageIndex] ?? null;
  const pageRows = useMemo(() => {
    if (!activeMonth) return filtered;
    return filtered.filter((row) => row.date.slice(0, 7) === activeMonth);
  }, [filtered, activeMonth]);

  if (isLoading) {
    return <div className="ioc-card p-6 text-sm text-ioc-muted">Loading receipt reconciliation...</div>;
  }

  return (
    <div className="ioc-card overflow-hidden">
      <p className="border-b border-ioc-border px-4 py-3 text-sm text-ioc-muted">
        Compares DSR <span className="font-medium text-ioc-navy">Receipt As Per Automation</span>{" "}
        with approved invoice fuel line litres (MS/HSD) on the same date.
      </p>

      {summary && (
        <div className="grid grid-cols-2 gap-3 border-b border-ioc-border p-4 sm:grid-cols-5">
          <Stat label="Rows" value={summary.total} />
          <Stat label="Matched" value={summary.matched} />
          <Stat label="Mismatch" value={summary.mismatch} />
          <Stat label="DSR only" value={summary.dsrOnly} />
          <Stat label="Invoice only" value={summary.invoiceOnly} />
        </div>
      )}

      <div className="border-b border-ioc-border p-4">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {monthsInView.length > 1 && (
        <div className="flex items-center justify-between border-b border-ioc-border bg-ioc-surface/50 px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            disabled={safePageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-medium text-ioc-navy">
            {activeMonth ?? "—"} — Page {safePageIndex + 1} of {monthsInView.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPageIndex((current) => Math.min(monthsInView.length - 1, current + 1))
            }
            disabled={safePageIndex >= monthsInView.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <WideTableScroll>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-ioc-border bg-ioc-surface/30 text-left text-ioc-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">DSR receipt (L)</th>
              <th className="px-4 py-3 text-right">Invoice litres</th>
              <th className="px-4 py-3 text-right">Invoice value</th>
              <th className="px-4 py-3 text-right">Litres delta</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ioc-muted">
                  No receipt rows in this period (days with zero receipt and no invoice are hidden).
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={`${row.date}-${row.product}`} className="border-b border-ioc-border/60">
                  <td className="whitespace-nowrap px-4 py-2.5">{row.date}</td>
                  <td className="px-4 py-2.5">{row.product}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.dsrReceiptLitres != null
                      ? `${formatIndianNumber(row.dsrReceiptLitres)} L`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.invoiceLitres != null
                      ? `${formatIndianNumber(row.invoiceLitres)} L`
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.invoiceValue != null ? formatCurrencyINR(row.invoiceValue) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.litresDelta != null ? `${formatIndianNumber(row.litresDelta)} L` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_STYLES[row.status]
                      )}
                    >
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </WideTableScroll>
    </div>
  );
}
