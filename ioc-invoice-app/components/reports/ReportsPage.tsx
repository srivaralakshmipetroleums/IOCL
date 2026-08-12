"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo, supplier, product }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate Excel reports in MS HSD format</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Invoice Report</CardTitle>
          <CardDescription>
            Exports approved invoice line items to Excel matching the MS HSD template format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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

          <Button onClick={handleExport} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Download Excel Report"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
