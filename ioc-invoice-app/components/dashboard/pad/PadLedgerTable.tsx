"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAD_TRANSACTION_CATEGORIES } from "@/lib/pad/categorize";
import { formatCurrencyINR } from "@/lib/dashboard/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PadLedgerRow {
  id: string;
  transaction_date: string | null;
  category: string;
  document_type: string | null;
  document_number: string | null;
  item_text: string;
  material_group: string | null;
  quantity: number | null;
  unit: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  plant: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  FUEL_MS: "bg-ioc-processing-light text-ioc-navy",
  FUEL_HSD: "bg-ioc-orange-light text-[#C77700]",
  PAYMENT: "bg-ioc-success-light text-ioc-success",
  MARGIN: "bg-blue-100 text-blue-800",
  DISCOUNT: "bg-purple-100 text-purple-800",
  FEE: "bg-red-100 text-red-700",
  INTEREST: "bg-red-100 text-red-700",
  CREDIT_MEMO: "bg-green-100 text-green-800",
  OTHER: "bg-gray-100 text-gray-700",
};

function monthKey(date: string | null): string | null {
  return date ? date.slice(0, 7) : null;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

interface PadLedgerTableProps {
  rows: PadLedgerRow[];
  isLoading?: boolean;
}

export function PadLedgerTable({ rows, isLoading }: PadLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);

  const docTypes = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.document_type) set.add(row.document_type);
    }
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const textMatch =
        !q ||
        [row.item_text, row.document_number, row.document_type, row.category]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const catMatch = !categoryFilter || row.category === categoryFilter;
      const docMatch = !docTypeFilter || row.document_type === docTypeFilter;
      return textMatch && catMatch && docMatch;
    });
  }, [rows, search, categoryFilter, docTypeFilter]);

  const monthsInView = useMemo(() => {
    const keys = new Set<string>();
    for (const row of filtered) {
      const key = monthKey(row.transaction_date);
      if (key) keys.add(key);
    }
    return [...keys].sort();
  }, [filtered]);

  useEffect(() => {
    setPageIndex(0);
  }, [monthsInView, search, categoryFilter, docTypeFilter]);

  const safePageIndex = monthsInView.length
    ? Math.min(pageIndex, monthsInView.length - 1)
    : 0;
  const activeMonth = monthsInView[safePageIndex] ?? null;

  const pageRows = useMemo(() => {
    if (!activeMonth) return filtered;
    return filtered.filter((row) => monthKey(row.transaction_date) === activeMonth);
  }, [filtered, activeMonth]);

  if (isLoading) {
    return <div className="ioc-card p-6 text-sm text-ioc-muted">Loading ledger...</div>;
  }

  return (
    <div className="ioc-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ioc-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Search UTR, bill no, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 flex-1 rounded-[10px] border border-ioc-border px-3 text-sm outline-none focus:border-ioc-blue sm:min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        >
          <option value="">All categories</option>
          {PAD_TRANSACTION_CATEGORIES.filter((c) => c !== "SUMMARY").map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value)}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        >
          <option value="">All document types</option>
          {docTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {monthsInView.length > 1 && (
        <div className="flex items-center justify-between border-b border-ioc-border bg-ioc-surface/50 px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={safePageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm font-medium text-ioc-navy">
            {activeMonth ? formatMonthLabel(activeMonth) : "—"} — Page {safePageIndex + 1} of{" "}
            {monthsInView.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.min(monthsInView.length - 1, p + 1))}
            disabled={safePageIndex >= monthsInView.length - 1}
          >
            Next
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
              <th className="px-4 py-3">Type</th>
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
                  No transactions for this period.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="border-b border-ioc-border/60 hover:bg-ioc-surface/20">
                  <td className="whitespace-nowrap px-4 py-2.5">{row.transaction_date ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        CATEGORY_COLORS[row.category] ?? CATEGORY_COLORS.OTHER
                      )}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-2.5" title={row.document_type ?? ""}>
                    {row.document_type ?? "—"}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2.5" title={row.item_text}>
                    {row.document_number || row.item_text}
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
