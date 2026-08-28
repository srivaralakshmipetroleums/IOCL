"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Archive } from "lucide-react";
import { triggerBrowserDownload } from "@/lib/download-file";
import {
  getCustomRangePeriod,
  getFinancialYearOptions,
  getFinancialYearPeriod,
  getFinancialYearStartYear,
  getSelectedMonthPeriod,
  MONTHS,
} from "@/lib/dashboard/period";
import { getYearOptions } from "@/lib/invoices/period-utils";

type OwnerPackMode = "month" | "financialYear" | "range";

export function OwnerPackReportSection() {
  const now = new Date();
  const [mode, setMode] = useState<OwnerPackMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fyStartYear, setFyStartYear] = useState(getFinancialYearStartYear(now));
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-04-01`);
  const [dateTo, setDateTo] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    if (mode === "month") return getSelectedMonthPeriod(year, month);
    if (mode === "financialYear") return getFinancialYearPeriod(fyStartYear);
    if (dateFrom && dateTo) return getCustomRangePeriod(dateFrom, dateTo);
    return null;
  }, [mode, year, month, fyStartYear, dateFrom, dateTo]);

  async function handleExport() {
    if (!period) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/owner-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          label: period.label,
          months: period.months,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(payload.error || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "Owner_Pack.zip";
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly owner pack</CardTitle>
        <CardDescription>
          One-click ZIP with Excel workbook (fuel P&amp;L, PAD, bank, invoices, day close,
          reconciliation exceptions) and a PDF summary for the owner or CA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["month", "financialYear", "range"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={mode === value ? "default" : "outline"}
              onClick={() => setMode(value)}
            >
              {value === "month" ? "Month" : value === "financialYear" ? "Financial year" : "Custom range"}
            </Button>
          ))}
        </div>

        {mode === "month" && (
          <div className="ioc-form-grid">
            <div className="ioc-form-field">
              <Label>Year</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {getYearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="ioc-form-field">
              <Label>Month</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "financialYear" && (
          <div className="ioc-form-field">
            <Label>Financial year starting</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={fyStartYear}
              onChange={(e) => setFyStartYear(Number(e.target.value))}
            >
              {getFinancialYearOptions().map((startYear) => (
                <option key={startYear} value={startYear}>
                  FY {startYear}-{String(startYear + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === "range" && (
          <div className="ioc-form-grid">
            <div className="ioc-form-field">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="ioc-form-field">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {period && (
          <p className="text-sm text-ioc-muted">
            Pack period: <span className="font-medium text-ioc-navy">{period.label}</span> (
            {period.dateFrom} to {period.dateTo})
          </p>
        )}

        {error && <p className="text-sm text-ioc-error">{error}</p>}

        <Button onClick={handleExport} disabled={loading || !period} className="w-full sm:w-auto">
          <Archive className="mr-2 h-4 w-4" />
          {loading ? "Building owner pack..." : "Download owner pack (ZIP)"}
        </Button>
      </CardContent>
    </Card>
  );
}
