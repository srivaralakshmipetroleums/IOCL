"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BANK_CATEGORY_LABELS, BANK_TRANSACTION_CATEGORIES } from "@/lib/bank/categorize";
import { formatCurrencyINR } from "@/lib/dashboard/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BankLedgerRow {
  id: string;
  txn_date: string;
  category: string;
  description: string;
  reference_no: string | null;
  branch_code: string | null;
  debit: number;
  credit: number;
  balance: number | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  IOCL_PAYMENT: "bg-ioc-orange-light text-ioc-orange",
  IOCL_CREDIT: "bg-ioc-success-light text-ioc-success",
  PHONEPE: "bg-ioc-processing-light text-ioc-blue",
  PAYTM: "bg-sky-100 text-sky-800",
  CARD_SETTLEMENT: "bg-blue-100 text-blue-800",
  POS_CARD: "bg-indigo-100 text-indigo-800",
  CASH_DEPOSIT: "bg-ioc-success-light text-ioc-success",
  UPI_CREDIT: "bg-purple-100 text-purple-800",
  UPI_DEBIT: "bg-red-100 text-red-700",
  SALARY: "bg-ioc-processing-light text-ioc-navy",
  BANK_CHARGE: "bg-red-100 text-red-700",
  NACH_ACH: "bg-red-100 text-red-700",
  CHEQUE: "bg-gray-100 text-gray-700",
  NEFT: "bg-ioc-processing-light text-ioc-mid-blue",
  RTGS: "bg-ioc-processing-light text-ioc-mid-blue",
  IMPS: "bg-ioc-processing-light text-ioc-blue",
  TRANSFER: "bg-gray-100 text-gray-700",
  INTEREST: "bg-green-100 text-green-800",
  OTHER: "bg-gray-100 text-gray-700",
};

function monthKey(date: string | null): string | null {
  return date ? date.slice(0, 7) : null;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

interface BankLedgerTableProps {
  rows: BankLedgerRow[];
  isLoading?: boolean;
}

export function BankLedgerTable({ rows, isLoading }: BankLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const textMatch =
        !q ||
        [row.description, row.reference_no, row.category].join(" ").toLowerCase().includes(q);
      return textMatch && (!categoryFilter || row.category === categoryFilter);
    });
  }, [rows, search, categoryFilter]);

  const monthsInView = useMemo(() => {
    const keys = new Set<string>();
    for (const row of filtered) {
      const key = monthKey(row.txn_date);
      if (key) keys.add(key);
    }
    return [...keys].sort();
  }, [filtered]);

  useEffect(() => {
    setPageIndex(0);
  }, [monthsInView, search, categoryFilter]);

  const safePageIndex = monthsInView.length ? Math.min(pageIndex, monthsInView.length - 1) : 0;
  const activeMonth = monthsInView[safePageIndex] ?? null;
  const pageRows = useMemo(() => {
    if (!activeMonth) return filtered;
    return filtered.filter((row) => monthKey(row.txn_date) === activeMonth);
  }, [filtered, activeMonth]);

  if (isLoading) {
    return <div className="ioc-card p-6 text-sm text-ioc-muted">Loading ledger...</div>;
  }

  return (
    <div className="ioc-card overflow-hidden">
      <div className="flex min-w-0 flex-col gap-3 border-b border-ioc-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Search description, UTR, reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full min-w-0 flex-1 rounded-[10px] border border-ioc-border px-3 text-sm outline-none focus:border-ioc-blue sm:min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 w-full min-w-0 max-w-full rounded-[10px] border border-ioc-border px-3 text-sm sm:w-auto"
        >
          <option value="">All categories</option>
          {BANK_TRANSACTION_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {BANK_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      {monthsInView.length > 1 && (
        <div className="flex items-center justify-between gap-2 border-b border-ioc-border bg-ioc-surface/50 px-3 py-2 sm:px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={safePageIndex === 0}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-medium text-ioc-navy">
              {activeMonth ? formatMonthLabel(activeMonth) : "—"}
              <span className="hidden sm:inline">
                {" "}
                — Page {safePageIndex + 1} of {monthsInView.length}
              </span>
            </p>
            <p className="text-xs text-ioc-muted sm:hidden">
              Page {safePageIndex + 1} of {monthsInView.length}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.min(monthsInView.length - 1, p + 1))}
            disabled={safePageIndex >= monthsInView.length - 1}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-ioc-border bg-ioc-surface/30 text-left text-ioc-muted">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ioc-muted">
                  No bank transactions for this period.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="border-b border-ioc-border/60 hover:bg-ioc-surface/20">
                  <td className="whitespace-nowrap px-4 py-2.5">{row.txn_date}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        CATEGORY_COLORS[row.category] ?? CATEGORY_COLORS.OTHER
                      )}
                    >
                      {BANK_CATEGORY_LABELS[row.category as keyof typeof BANK_CATEGORY_LABELS] ??
                        row.category}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2.5" title={row.description}>
                    {row.description}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-2.5" title={row.reference_no ?? ""}>
                    {row.reference_no || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.debit > 0 ? formatCurrencyINR(row.debit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.credit > 0 ? formatCurrencyINR(row.credit) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {row.balance != null ? formatCurrencyINR(row.balance) : "—"}
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
