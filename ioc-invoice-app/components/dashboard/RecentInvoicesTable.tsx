"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceRow {
  id: string;
  invoice_date: string | null;
  invoice_number: string | null;
  supplier_name: string | null;
  invoice_total: number | null;
  status: string;
  line_item_count?: number;
}

export function RecentInvoicesTable() {
  const { data, isLoading } = useQuery<{ data: InvoiceRow[] }>({
    queryKey: ["recent-invoices"],
    queryFn: () => fetch("/api/invoices?pageSize=5&page=1").then((r) => r.json()),
  });

  const items = data?.data ?? [];

  return (
    <div className="ioc-card overflow-hidden">
      <div className="border-b border-ioc-border px-5 py-4">
        <h3 className="text-sm font-semibold text-ioc-navy">Recent Invoices</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ioc-section">
              {["Date", "Bill No", "Supplier", "Products", "Invoice Value", "Status"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ioc-navy"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ioc-muted">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-ioc-muted">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              items.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-ioc-border transition-colors hover:bg-ioc-section"
                >
                  <td className="px-4 py-2.5">
                    {inv.invoice_date ? formatDate(inv.invoice_date) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-mono text-xs text-ioc-blue hover:underline"
                    >
                      {inv.invoice_number || "—"}
                    </Link>
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-2.5" title={inv.supplier_name || ""}>
                    {inv.supplier_name || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ioc-muted">—</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatCurrency(inv.invoice_total ?? 0)}
                  </td>
                  <td className="px-4 py-2.5">
                    <InvoiceStatusBadge status={inv.status} />
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
