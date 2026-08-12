"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface DashboardSummary {
  invoiceCount: number;
  totalValue: number;
  totalQuantity: number;
  lineItemCount: number;
}

export function DashboardPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  const qs = queryParams.toString();

  const { data: summary, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/summary?${qs}`).then((r) => r.json()),
  });

  const { data: valueByDate } = useQuery({
    queryKey: ["dashboard-value", dateFrom, dateTo],
    queryFn: () => fetch(`/api/dashboard/value-by-date?${qs}`).then((r) => r.json()),
  });

  const { data: productQuantity } = useQuery({
    queryKey: ["dashboard-product-qty"],
    queryFn: () => fetch("/api/dashboard/product-quantity").then((r) => r.json()),
  });

  const { data: monthlyCount } = useQuery({
    queryKey: ["dashboard-monthly"],
    queryFn: () => fetch("/api/dashboard/monthly-count").then((r) => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Invoice analytics and summary</p>
      </div>

      <div className="flex gap-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KpiCard title="Total Invoices" value={String(summary?.invoiceCount ?? 0)} />
            <KpiCard title="Total Value" value={formatCurrency(summary?.totalValue ?? 0)} />
            <KpiCard title="Total Quantity (L)" value={String(summary?.totalQuantity ?? 0)} />
            <KpiCard title="Line Items" value={String(summary?.lineItemCount ?? 0)} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Invoice Value by Date</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valueByDate || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Product Quantity</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productQuantity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="quantity" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Monthly Invoice Count</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCount || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
