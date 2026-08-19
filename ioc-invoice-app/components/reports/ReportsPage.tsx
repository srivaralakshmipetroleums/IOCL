"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/layout/PageTitle";
import { PadAccountReportSection } from "@/components/reports/PadAccountReportSection";
import { triggerBrowserDownload } from "@/lib/download-file";
import { Download } from "lucide-react";

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo, supplier, product }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(payload.error || "Export failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "IOC_Invoices.xlsx";
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      console.error(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <PageTitle>Reports</PageTitle>
        <p className="mt-2 text-sm text-ioc-muted">
          Invoice Excel export and PAD / Accounts statements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Invoice Report</CardTitle>
          <CardDescription>
            Exports invoice line items (EBMS and HSD-BSVI) to Excel matching the MS HSD template format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input placeholder="Filter by supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Input placeholder="Filter by product" value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={handleExport} disabled={loading} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Download Excel Report"}
          </Button>
        </CardContent>
      </Card>

      <PadAccountReportSection />
    </div>
  );
}
