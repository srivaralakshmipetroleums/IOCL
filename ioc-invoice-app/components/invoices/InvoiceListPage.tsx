"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">Search and manage invoice records</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by invoice number or supplier..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
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
        <CardHeader><CardTitle>Invoice List</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !data?.data?.length ? (
            <p className="py-8 text-center text-muted-foreground">No invoices found. Upload PDFs to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium">Invoice #</th>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Supplier</th>
                    <th className="pb-3 pr-4 font-medium">Total</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-3 pr-4">{invoice.invoice_number}</td>
                      <td className="py-3 pr-4">{invoice.invoice_date ? formatDate(invoice.invoice_date) : "—"}</td>
                      <td className="py-3 pr-4">{invoice.supplier_name}</td>
                      <td className="py-3 pr-4">{invoice.invoice_total ? formatCurrency(invoice.invoice_total) : "—"}</td>
                      <td className="py-3 pr-4"><InvoiceStatusBadge status={invoice.status} /></td>
                      <td className="py-3">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
