"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceLineItem } from "@/types/database";

interface InvoiceDetail extends Invoice {
  line_items: InvoiceLineItem[];
}

export function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<Partial<Invoice>>({});

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ["invoice", id],
    queryFn: () => fetch(`/api/invoices/${id}`).then((r) => r.json()),
  });

  const { data: pdfData } = useQuery<{ url: string }>({
    queryKey: ["invoice-pdf", id],
    queryFn: () => fetch(`/api/invoices/${id}/pdf`).then((r) => r.json()),
    enabled: !!invoice?.pdf_storage_path,
  });

  async function handleApprove() {
    await fetch(`/api/invoices/${id}/approve`, { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["invoice", id] });
  }

  async function handleRetry() {
    const mode = localStorage.getItem("ioc-extraction-mode") || "claude";
    await fetch(`/api/invoices/${id}/retry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractorMode: mode }),
    });
    queryClient.invalidateQueries({ queryKey: ["invoice", id] });
  }

  async function handleDelete() {
    if (!confirm(`Delete invoice ${invoice?.invoice_number || id}? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const text = await res.text();
      let data: { error?: string } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(text.slice(0, 200) || "Failed to delete invoice");
        }
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete invoice");
      }

      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      router.push("/invoices");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete invoice");
      setDeleting(false);
    }
  }

  async function handleSave() {
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, status: "NEEDS_REVIEW" }),
    });
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["invoice", id] });
  }

  if (isLoading) return <Skeleton className="h-96" />;
  if (!invoice) return <p>Invoice not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/invoices" className="text-sm text-muted-foreground hover:underline">← Back to Invoices</Link>
          <h1 className="text-3xl font-bold">Invoice {invoice.invoice_number}</h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="flex gap-2">
          {invoice.status !== "APPROVED" && (
            <Button onClick={handleApprove}>Approve</Button>
          )}
          {(invoice.status === "FAILED" || invoice.status === "EXTRACTED") && (
            <Button variant="outline" onClick={handleRetry}>Retry Extraction</Button>
          )}
          <Button variant="outline" onClick={() => { setEditing(!editing); setFormData(invoice); }}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <Field label="Invoice Number (SAP)" value={formData.invoice_number || ""} onChange={(v) => setFormData({ ...formData, invoice_number: v, sap_entry_number: v })} />
                <Field label="Supplier" value={formData.supplier_name || ""} onChange={(v) => setFormData({ ...formData, supplier_name: v })} />
                <Field label="Date" value={formData.invoice_date || ""} onChange={(v) => setFormData({ ...formData, invoice_date: v })} type="date" />
                <Button onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Invoice Number (SAP)" value={invoice.invoice_number} />
                <Detail label="Date" value={invoice.invoice_date ? formatDate(invoice.invoice_date) : "—"} />
                <Detail label="Supplier" value={invoice.supplier_name} />
                <Detail label="Total" value={invoice.invoice_total ? formatCurrency(invoice.invoice_total) : "—"} />
                <Detail label="SAP Entry" value={invoice.sap_entry_number || invoice.invoice_number} />
                <Detail label="Delivery #" value={invoice.delivery_number} />
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>PDF Preview</CardTitle></CardHeader>
          <CardContent>
            {pdfData?.url ? (
              <iframe src={pdfData.url} className="h-96 w-full rounded border" title="Invoice PDF" />
            ) : (
              <p className="py-8 text-center text-muted-foreground">No PDF available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4">Output Qty</th>
                <th className="pb-2 pr-4">Measure</th>
                <th className="pb-2 pr-4">HSN</th>
                <th className="pb-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items?.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2 pr-4">{item.product}</td>
                  <td className="py-2 pr-4">{item.quantity}</td>
                  <td className="py-2 pr-4">{item.unit}</td>
                  <td className="py-2 pr-4">{item.output_quantity}</td>
                  <td className="py-2 pr-4">{item.output_measure}</td>
                  <td className="py-2 pr-4">{item.hsn_code}</td>
                  <td className="py-2">{item.invoice_value ? formatCurrency(item.invoice_value) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
