"use client";

import { useMemo, useState } from "react";
import type { PadReconciliationRow } from "@/lib/pad/reconciliation";
import { formatCurrencyINR } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  MATCHED: "bg-ioc-success-light text-ioc-success",
  PAD_ONLY: "bg-ioc-orange-light text-[#C77700]",
  INVOICE_ONLY: "bg-blue-100 text-blue-800",
  AMOUNT_MISMATCH: "bg-red-100 text-red-700",
};

interface PadReconciliationTableProps {
  rows: PadReconciliationRow[];
  summary?: {
    total: number;
    matched: number;
    padOnly: number;
    invoiceOnly: number;
    mismatches: number;
  };
  isLoading?: boolean;
}

export function PadReconciliationTable({
  rows,
  summary,
  isLoading,
}: PadReconciliationTableProps) {
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  if (isLoading) {
    return <div className="ioc-card p-6 text-sm text-ioc-muted">Loading reconciliation...</div>;
  }

  return (
    <div className="ioc-card overflow-hidden">
      {summary && (
        <div className="grid grid-cols-2 gap-3 border-b border-ioc-border p-4 sm:grid-cols-5">
          <Stat label="Total" value={summary.total} />
          <Stat label="Matched" value={summary.matched} />
          <Stat label="PAD only" value={summary.padOnly} />
          <Stat label="Invoice only" value={summary.invoiceOnly} />
          <Stat label="Mismatches" value={summary.mismatches} />
        </div>
      )}

      <div className="border-b border-ioc-border p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="MATCHED">Matched</option>
          <option value="PAD_ONLY">PAD only</option>
          <option value="INVOICE_ONLY">Invoice only</option>
          <option value="AMOUNT_MISMATCH">Amount mismatch</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-ioc-border bg-ioc-surface/30 text-left text-ioc-muted">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Billing Doc</th>
              <th className="px-4 py-3">PAD Date</th>
              <th className="px-4 py-3 text-right">PAD Debit</th>
              <th className="px-4 py-3 text-right">PAD Qty (KL)</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3 text-right">Invoice Total</th>
              <th className="px-4 py-3 text-right">Invoice Qty (KL)</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-ioc-muted">
                  No reconciliation rows.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={`${row.padTransactionId}-${row.invoiceId}-${i}`}
                  className="border-b border-ioc-border/60"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        STATUS_STYLES[row.status]
                      )}
                    >
                      {row.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{row.billingDoc ?? "—"}</td>
                  <td className="px-4 py-2.5">{row.padDate ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.padDebit > 0 ? formatCurrencyINR(row.padDebit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.padQuantityKl != null ? row.padQuantityKl : "—"}
                  </td>
                  <td className="px-4 py-2.5">{row.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.invoiceTotal != null ? formatCurrencyINR(row.invoiceTotal) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.invoiceQuantityKl != null ? row.invoiceQuantityKl : "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-ioc-muted">
                    {row.mismatchReason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ioc-surface/50 px-3 py-2">
      <p className="text-xs text-ioc-muted">{label}</p>
      <p className="text-lg font-bold text-ioc-navy">{value}</p>
    </div>
  );
}
