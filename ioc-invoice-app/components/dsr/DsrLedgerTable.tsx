"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, SlidersHorizontal } from "lucide-react";
import { formatCurrencyINR, formatIndianNumber, formatPricePerLitre } from "@/lib/dashboard/format";
import { triggerBrowserDownload } from "@/lib/download-file";
import {
  DSR_LEDGER_DEFAULT_VISIBLE_KEYS,
  DSR_LEDGER_MEASURE_COLUMNS,
  parseDsrLedgerVisibleKeys,
  type DsrLedgerColumnFormat,
  type DsrLedgerMeasureKey,
} from "@/lib/iras/dsr/ledger-columns";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";
import { Button } from "@/components/ui/button";
import { WideTableScroll } from "@/components/ui/simple-table";
import { cn } from "@/lib/utils";

const PRODUCT_COLORS: Record<IrasDsrProduct, string> = {
  MS: "bg-ioc-processing-light text-ioc-navy",
  HSD: "bg-ioc-orange-light text-[#C77700]",
};

const VISIBLE_COLUMNS_STORAGE_KEY = "dsr-ledger-visible-columns";

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

function formatCell(value: number | null, format: DsrLedgerColumnFormat): string {
  if (value == null) return "—";
  if (format === "money") return formatCurrencyINR(value);
  if (format === "rate") return formatPricePerLitre(value);
  if (format === "litres") return formatLitres(value);
  return formatIndianNumber(value);
}

function loadVisibleKeys(): DsrLedgerMeasureKey[] {
  if (typeof window === "undefined") return DSR_LEDGER_DEFAULT_VISIBLE_KEYS;
  try {
    const raw = window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);
    if (!raw) return DSR_LEDGER_DEFAULT_VISIBLE_KEYS;
    return parseDsrLedgerVisibleKeys(JSON.parse(raw)) ?? DSR_LEDGER_DEFAULT_VISIBLE_KEYS;
  } catch {
    return DSR_LEDGER_DEFAULT_VISIBLE_KEYS;
  }
}

interface DsrLedgerTableProps {
  rows: DsrLedgerRow[];
  isLoading?: boolean;
  dateFrom: string;
  dateTo: string;
  periodLabel?: string;
}

export function DsrLedgerTable({
  rows,
  isLoading,
  dateFrom,
  dateTo,
  periodLabel,
}: DsrLedgerTableProps) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<"" | IrasDsrProduct>("");
  const [pageIndex, setPageIndex] = useState(0);
  const [visibleKeys, setVisibleKeys] = useState<DsrLedgerMeasureKey[]>(DSR_LEDGER_DEFAULT_VISIBLE_KEYS);
  const [columnsReady, setColumnsReady] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleKeys(loadVisibleKeys());
    setColumnsReady(true);
  }, []);

  useEffect(() => {
    if (!columnsReady) return;
    window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleKeys));
  }, [visibleKeys, columnsReady]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!columnsRef.current?.contains(event.target as Node)) {
        setColumnsOpen(false);
      }
    }
    if (!columnsOpen) return;
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [columnsOpen]);

  const visibleColumns = useMemo(
    () => DSR_LEDGER_MEASURE_COLUMNS.filter((column) => visibleKeys.includes(column.key)),
    [visibleKeys]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const textMatch =
        !query ||
        [row.dateDisplay, row.product, row.date].join(" ").toLowerCase().includes(query);
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

  const safePageIndex = monthsInView.length ? Math.min(pageIndex, monthsInView.length - 1) : 0;
  const activeMonth = monthsInView[safePageIndex] ?? null;

  const pageRows = useMemo(() => {
    if (!activeMonth) return filtered;
    return filtered.filter((row) => monthKey(row.date) === activeMonth);
  }, [filtered, activeMonth]);

  function toggleColumn(key: DsrLedgerMeasureKey) {
    setVisibleKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  async function exportExcel() {
    if (filtered.length === 0) return;
    setExportError(null);
    setExporting(true);
    try {
      const res = await fetch("/api/dashboard/dsr/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          label: periodLabel,
          columnKeys: visibleKeys,
          rows: filtered,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(payload.error || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      triggerBrowserDownload(blob, filenameMatch?.[1] || "DSR_Ledger.xlsx");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return <div className="ioc-card p-6 text-sm text-ioc-muted">Loading DSR ledger...</div>;
  }

  const tableMinWidth = Math.max(720, 180 + visibleColumns.length * 140);

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
        <div className="relative" ref={columnsRef}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setColumnsOpen((open) => !open)}
            aria-expanded={columnsOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Columns
          </Button>
          {columnsOpen && (
            <div className="absolute right-0 z-30 mt-2 w-72 rounded-[10px] border border-ioc-border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-ioc-muted">Visible columns</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="text-xs text-ioc-blue hover:underline"
                    onClick={() => setVisibleKeys(DSR_LEDGER_DEFAULT_VISIBLE_KEYS)}
                  >
                    Summary
                  </button>
                  <span className="text-ioc-muted">·</span>
                  <button
                    type="button"
                    className="text-xs text-ioc-blue hover:underline"
                    onClick={() =>
                      setVisibleKeys(DSR_LEDGER_MEASURE_COLUMNS.map((column) => column.key))
                    }
                  >
                    All
                  </button>
                </div>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {DSR_LEDGER_MEASURE_COLUMNS.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-ioc-navy hover:bg-ioc-surface/60"
                  >
                    <input
                      type="checkbox"
                      checked={visibleKeys.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ioc-muted">Date and product stay visible. Excel always includes RSP.</p>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void exportExcel()}
          disabled={exporting || filtered.length === 0}
        >
          <FileSpreadsheet className="h-4 w-4" />
          {exporting ? "Exporting..." : "Download Excel"}
        </Button>
      </div>

      {exportError && (
        <p className="border-b border-ioc-warning/30 bg-ioc-warning-light px-4 py-2 text-sm text-ioc-navy">
          {exportError}
        </p>
      )}

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
        <table className="w-full text-sm" style={{ minWidth: tableMinWidth }}>
          <thead>
            <tr className="border-b border-ioc-border bg-ioc-surface/30 text-left text-ioc-muted">
              <th className="sticky left-0 z-10 bg-ioc-surface/95 px-3 py-3">Date</th>
              <th className="sticky left-[88px] z-10 bg-ioc-surface/95 px-3 py-3">Product</th>
              {visibleColumns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-3 text-right">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-4 py-8 text-center text-ioc-muted">
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
                  {visibleColumns.map((column) => (
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
