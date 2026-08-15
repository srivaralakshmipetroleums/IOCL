"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/layout/PageTitle";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/types/database";

export function InvoiceListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const { data, isLoading } = useQuery<{ data: Invoice[]; total: number }>({
    queryKey: ["invoices", search, status, page],
    queryFn: () => fetch(`/api/invoices?${params}`).then((r) => r.json()),
  });

  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <PageTitle>Invoices</PageTitle>
        <p className="mt-2 text-sm text-ioc-muted">Search and manage invoice records</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search by invoice number, supplier, or date (DD/MM/YYYY)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full sm:max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm sm:w-auto"
        >
          <option value="">All Statuses</option>
          <option value="EXTRACTED">Extracted</option>
          <option value="NEEDS_REVIEW">Needs Review</option>
          <option value="APPROVED">Approved</option>
          <option value="FAILED">Failed</option>
          <option value="DUPLICATE">Duplicate</option>
        </select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-5 sm:pt-0">
          {isLoading ? (
            <div className="space-y-2 p-4 sm:p-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <p className="px-4 py-8 text-center text-ioc-muted sm:px-0">
              No invoices found. Upload PDFs to get started.
            </p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="space-y-3 p-4 md:hidden">
                {data.data.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="rounded-[10px] border border-ioc-border bg-ioc-section p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-ioc-navy">
                          {invoice.invoice_number || "—"}
                        </p>
                        <p className="mt-1 text-xs text-ioc-muted">
                          {invoice.invoice_date ? formatDate(invoice.invoice_date) : "—"}
                        </p>
                      </div>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <p className="mt-2 truncate text-sm">{invoice.supplier_name}</p>
                    <p className="mt-1 text-sm font-semibold text-ioc-navy">
                      {invoice.invoice_total ? formatCurrency(invoice.invoice_total) : "—"}
                    </p>
                    <Link href={`/invoices/${invoice.id}`} className="mt-3 block">
                      <Button variant="outline" size="sm" className="w-full">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-ioc-border bg-ioc-section text-left">
                      <th className="px-4 py-3 font-semibold text-ioc-navy">Invoice #</th>
                      <th className="px-4 py-3 font-semibold text-ioc-navy">Date</th>
                      <th className="px-4 py-3 font-semibold text-ioc-navy">Supplier</th>
                      <th className="px-4 py-3 font-semibold text-ioc-navy">Total</th>
                      <th className="px-4 py-3 font-semibold text-ioc-navy">Status</th>
                      <th className="px-4 py-3 font-semibold text-ioc-navy">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-ioc-border hover:bg-ioc-section">
                        <td className="px-4 py-3">{invoice.invoice_number}</td>
                        <td className="px-4 py-3">
                          {invoice.invoice_date ? formatDate(invoice.invoice_date) : "—"}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3">{invoice.supplier_name}</td>
                        <td className="px-4 py-3">
                          {invoice.invoice_total ? formatCurrency(invoice.invoice_total) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceStatusBadge status={invoice.status} />
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-ioc-border px-4 py-4 sm:flex-row sm:px-0">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="w-full sm:w-auto"
              >
                Previous
              </Button>
              <span className="text-sm text-ioc-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="w-full sm:w-auto"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
