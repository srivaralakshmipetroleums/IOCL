"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductTag } from "@/components/dashboard/DashboardParts";
import { FUEL_PRODUCTS } from "@/lib/dashboard/fuel-products";
import { formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import { matchesDateSearch, parseMonthSearch, parseSearchDate } from "@/lib/search/date-search";
import { Button } from "@/components/ui/button";
import { WideTableScroll } from "@/components/ui/simple-table";

export interface LineItemRow {
  id: string;
  invoice_date: string;
  invoice_date_iso: string;
  supplier: string;
  bill_no: string;
  product: string;
  invoice_value: number;
  hsn_code: string;
  quantity_litres: number;
}

type SortKey = keyof Pick<
  LineItemRow,
  "invoice_date" | "supplier" | "bill_no" | "product" | "invoice_value" | "hsn_code" | "quantity_litres"
>;

function monthKeyFromRow(row: LineItemRow): string {
  return row.invoice_date_iso.slice(0, 7);
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

interface LineItemsTableProps {
  items: LineItemRow[];
  isLoading?: boolean;
}

export function LineItemsTable({ items, isLoading }: LineItemsTableProps) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("invoice_date");
  const [sortAsc, setSortAsc] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);

  const products = useMemo(() => [...FUEL_PRODUCTS], []);

  const filtered = useMemo(() => {
    const q = search.trim();
    const qLower = q.toLowerCase();
    const isDateQuery = Boolean(parseSearchDate(q) || parseMonthSearch(q));

    return items.filter((row) => {
      const dateMatch = q ? matchesDateSearch(q, row.invoice_date_iso) : true;
      const textMatch =
        !q ||
        [row.supplier, row.bill_no, row.product, row.hsn_code]
          .join(" ")
          .toLowerCase()
          .includes(qLower);

      const matchesSearch = isDateQuery ? dateMatch : textMatch || dateMatch;
      return matchesSearch && (!productFilter || row.product === productFilter);
    });
  }, [items, search, productFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = sortKey === "invoice_date" ? a.invoice_date_iso : a[sortKey];
      const bv = sortKey === "invoice_date" ? b.invoice_date_iso : b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortAsc ? av - bv : bv - av;
      }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortAsc]);

  const monthsInView = useMemo(() => {
    const keys = new Set<string>();
    for (const row of sorted) {
      keys.add(monthKeyFromRow(row));
    }
    return [...keys].sort();
  }, [sorted]);

  useEffect(() => {
    setPageIndex(0);
  }, [monthsInView.join(",")]);

  const safePageIndex = monthsInView.length
    ? Math.min(pageIndex, monthsInView.length - 1)
    : 0;
  const currentMonth = monthsInView[safePageIndex];

  const pageItems = useMemo(() => {
    if (!currentMonth) return [];
    return sorted.filter((row) => monthKeyFromRow(row) === currentMonth);
  }, [sorted, currentMonth]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const columns: Array<{ key: SortKey; label: string; align?: "right" }> = [
    { key: "invoice_date", label: "Date" },
    { key: "supplier", label: "Supplier" },
    { key: "bill_no", label: "Bill No" },
    { key: "product", label: "Product" },
    { key: "invoice_value", label: "Invoice Value (₹)", align: "right" },
    { key: "hsn_code", label: "HSN Code" },
    { key: "quantity_litres", label: "Quantity (L)", align: "right" },
  ];

  return (
    <div className="ioc-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-ioc-border bg-ioc-section px-5 py-4">
        <input
          type="text"
          placeholder="Search by bill no, product, date (DD/MM/YYYY)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-[10px] border border-ioc-border bg-white px-3.5 py-2 text-sm outline-none focus:border-ioc-blue focus:ring-2 focus:ring-ioc-blue/20"
        />
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-[10px] border border-ioc-border bg-white px-3.5 py-2 text-sm outline-none focus:border-ioc-blue"
        >
          <option value="">All Products (EBMS & HSD-BSVI)</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap rounded-full bg-ioc-navy px-3 py-1 text-xs font-semibold text-white">
          {sorted.length} rows
          {monthsInView.length > 1 && currentMonth
            ? ` · ${formatMonthLabel(currentMonth)}`
            : ""}
        </span>
      </div>

      <WideTableScroll>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap bg-ioc-navy px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:bg-ioc-blue ${col.align === "right" ? "text-right" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon active={sortKey === col.key} asc={sortAsc} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-ioc-muted">
                  Loading line items…
                </td>
              </tr>
            ) : pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-ioc-muted">
                  No data found for this period.
                </td>
              </tr>
            ) : (
              pageItems.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-ioc-border transition-colors hover:bg-ioc-section"
                >
                  <td className="px-3.5 py-2.5">{row.invoice_date}</td>
                  <td className="max-w-[200px] truncate px-3.5 py-2.5" title={row.supplier}>
                    {row.supplier}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-xs">{row.bill_no}</td>
                  <td className="px-3.5 py-2.5">
                    <ProductTag product={row.product} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {formatCurrencyINR(row.invoice_value)}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-xs">{row.hsn_code}</td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">
                    {formatIndianNumber(row.quantity_litres)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </WideTableScroll>

      {monthsInView.length > 1 && currentMonth && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ioc-border bg-ioc-section px-5 py-3">
          <p className="text-sm text-ioc-muted">
            <span className="font-medium text-ioc-navy">{formatMonthLabel(currentMonth)}</span>
            {" · "}
            {pageItems.length} row{pageItems.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
              disabled={safePageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="min-w-[88px] text-center text-sm font-medium text-ioc-navy">
              Page {safePageIndex + 1} of {monthsInView.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPageIndex((index) => Math.min(monthsInView.length - 1, index + 1))
              }
              disabled={safePageIndex >= monthsInView.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
  return asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}
