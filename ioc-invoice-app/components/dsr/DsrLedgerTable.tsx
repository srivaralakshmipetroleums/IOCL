"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";
import { Button } from "@/components/ui/button";
import { WideTableScroll } from "@/components/ui/simple-table";
import { cn } from "@/lib/utils";

const PRODUCT_COLORS: Record<IrasDsrProduct, string> = {
  MS: "bg-ioc-processing-light text-ioc-navy",
  HSD: "bg-ioc-orange-light text-[#C77700]",
};

const LEDGER_COLUMNS: Array<{
  key: keyof DsrLedgerRow;
  label: string;
  format: "litres" | "number" | "money";
}> = [
  { key: "productDip", label: "Product dip", format: "number" },
  { key: "productVolume", label: "Product volume", format: "litres" },
  { key: "totalOpeningStock", label: "Opening stock", format: "litres" },
  { key: "receiptAsAutomation", label: "Receipt", format: "litres" },
  { key: "totalStock", label: "Total stock", format: "litres" },
  { key: "nozzleN1", label: "Nozzle N1", format: "number" },
  { key: "nozzleN2", label: "Nozzle N2", format: "number" },
  { key: "testingLitres", label: "Testing", format: "litres" },
  { key: "netTankSales", label: "Net tank sales", format: "litres" },
  { key: "netTotalizerSales", label: "Net totalizer sales", format: "litres" },
  { key: "netCumulativeTotalizerSales", label: "Cum. totalizer", format: "litres" },
  { key: "netTransactionSales", label: "Net transaction sales", format: "litres" },
  { key: "netCumulativeTransactionSales", label: "Cum. transaction", format: "litres" },
  { key: "lossGainDayTotalizer", label: "L/G day (totalizer)", format: "litres" },
  { key: "cummLossGainMonthTotalizer", label: "Cum. L/G (totalizer)", format: "litres" },
  { key: "lossGainDayTransaction", label: "L/G day (transaction)", format: "litres" },
  { key: "cummLossGainMonthTransaction", label: "Cum. L/G (transaction)", format: "litres" },
  { key: "grossProfit", label: "Gross profit", format: "money" },
];

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatLitres(value: number | null): string {
  if (value == null) return "—";
  return `${formatIndianNumber(value)} L`;
}

function formatCell(value: number | null, format: "litres" | "number" | "money"): string {
  if (value == null) return "—";
  if (format === "money") return formatCurrencyINR(value);
  if (format === "litres") return formatLitres(value);
  return formatIndianNumber(value);
}

interface DsrLedgerTableProps {
  rows: DsrLedgerRow[];
  isLoading?: boolean;
}

export function DsrLedgerTable({ rows, isLoading }: DsrLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<"" | IrasDsrProduct>("");
  const [pageIndex, setPageIndex] = useState(0);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const textMatch =
        !query ||
        [row.dateDisplay, row.product, row.date]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const productMatch = !productFilter || row.product === productFilter;
      return textMatch && productMatch;
    });
  }, [rows, search, productFilter]);

  const monthsInView = useMemo(() => {
    const keys = new Set<string>();
    for (const row of filtered) {
      keys.add(monthKey(row.date));
    }
    return [...keys].sort();
  }, [filtered]);

  useEffect(() => {
    setPageIndex(0);
  }, [monthsInView, search, productFilter]);

  const safePageIndex = monthsInView.length
    ? Math.min(pageIndex, monthsInView.length - 1)
    : 0;
  const activeMonth = monthsInView[safePageIndex] ?? null;

  const pageRows = useMemo(() => {
    if (!activeMonth) return filtered;
    return filtered.filter((row) => monthKey(row.date) === activeMonth);
  }, [filtered, activeMonth]);

  if (isLoading) {
    return <div className="ioc-card p-6 text-sm text-ioc-muted">Loading DSR ledger...</div>;
  }

  return (
    <div className="ioc-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ioc-border p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder="Search date or product..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 flex-1 rounded-[10px] border border-ioc-border px-3 text-sm outline-none focus:border-ioc-blue sm:min-w-[200px]"
        />
        <select
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value as "" | IrasDsrProduct)}
          className="h-10 rounded-[10px] border border-ioc-border px-3 text-sm"
        >
          <option value="">All products</option>
          <option value="MS">MS</option>
          <option value="HSD">HSD</option>
        </select>
      </div>

      {monthsInView.length > 1 && (
        <div className="flex items-center justify-between gap-2 border-b border-ioc-border bg-ioc-surface/50 px-3 py-2 sm:px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
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
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPageIndex((current) => Math.min(monthsInView.length - 1, current + 1))
            }
            disabled={safePageIndex >= monthsInView.length - 1}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <WideTableScroll>
        <table className="w-full min-w-[2400px] text-sm">
          <thead>
            <tr className="border-b border-ioc-border bg-ioc-surface/30 text-left text-ioc-muted">
              <th className="sticky left-0 z-10 bg-ioc-surface/95 px-3 py-3">Date</th>
              <th className="sticky left-[88px] z-10 bg-ioc-surface/95 px-3 py-3">Product</th>
              {LEDGER_COLUMNS.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-3 text-right">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={LEDGER_COLUMNS.length + 2} className="px-4 py-8 text-center text-ioc-muted">
                  No DSR records for this period.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="border-b border-ioc-border/60 hover:bg-ioc-surface/20">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2.5">
                    {row.dateDisplay}
                  </td>
                  <td className="sticky left-[88px] z-10 bg-white px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        PRODUCT_COLORS[row.product]
                      )}
                    >
                      {row.product}
                    </span>
                  </td>
                  {LEDGER_COLUMNS.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-3 py-2.5 text-right">
                      {formatCell(row[column.key] as number | null, column.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </WideTableScroll>
    </div>
  );
}
