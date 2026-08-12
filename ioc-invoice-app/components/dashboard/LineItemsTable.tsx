"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ProductTag } from "@/components/dashboard/DashboardParts";
import { formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";

export interface LineItemRow {
  id: string;
  invoice_date: string;
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

  const products = useMemo(
    () => [...new Set(items.map((r) => r.product).filter(Boolean))].sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((row) => {
      const text = [row.invoice_date, row.supplier, row.bill_no, row.product, row.hsn_code]
        .join(" ")
        .toLowerCase();
      return (!q || text.includes(q)) && (!productFilter || row.product === productFilter);
    });
  }, [items, search, productFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
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
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-center gap-3 bg-[#D6E4F0] px-5 py-4">
        <input
          type="text"
          placeholder="Search by bill no, product, date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#2E75B6]"
        />
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#2E75B6]"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="whitespace-nowrap rounded-full bg-[#1F4E79] px-3 py-1 text-xs font-semibold text-white">
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
                  className={`cursor-pointer select-none whitespace-nowrap bg-[#1F4E79] px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#2E75B6] ${col.align === "right" ? "text-right" : ""}`}
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
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  Loading line items…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-gray-400">
                  No data found for this period.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 transition-colors hover:bg-[#D6E4F0]/50">
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
