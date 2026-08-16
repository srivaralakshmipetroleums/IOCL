"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ProductTag } from "@/components/dashboard/DashboardParts";
import { FUEL_PRODUCTS } from "@/lib/dashboard/fuel-products";
import { formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import { matchesDateSearch, parseMonthSearch, parseSearchDate } from "@/lib/search/date-search";

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

interface LineItemsTableProps {
  items: LineItemRow[];
  isLoading?: boolean;
}

export function LineItemsTable({ items, isLoading }: LineItemsTableProps) {
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("invoice_date");
  const [sortAsc, setSortAsc] = useState(true);

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
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-ioc-muted">
                  No data found for this period.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
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
      </div>
    </div>
  );
}

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
  return asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}
