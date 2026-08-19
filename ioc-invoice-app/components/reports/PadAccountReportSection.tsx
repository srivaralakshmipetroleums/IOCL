"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText } from "lucide-react";
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

type PadReportMode = "month" | "financialYear" | "range";

async function downloadReport(path: string, body: object, fallbackName: string) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Export failed" }));
    throw new Error(payload.error || "Export failed");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] || fallbackName;
  triggerBrowserDownload(blob, filename);
}

export function PadAccountReportSection() {
  const now = new Date();
  const [mode, setMode] = useState<PadReportMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fyStartYear, setFyStartYear] = useState(getFinancialYearStartYear(now));
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-04-01`);
  const [dateTo, setDateTo] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    if (mode === "month") return getSelectedMonthPeriod(year, month);
    if (mode === "financialYear") return getFinancialYearPeriod(fyStartYear);
    if (dateFrom && dateTo) return getCustomRangePeriod(dateFrom, dateTo);
    return null;
  }, [mode, year, month, fyStartYear, dateFrom, dateTo]);

  async function exportReport(format: "excel" | "pdf") {
    if (!period) return;
    setError(null);
    const setLoading = format === "excel" ? setExcelLoading : setPdfLoading;
    setLoading(true);
    try {
      await downloadReport(
        format === "excel" ? "/api/reports/pad/excel" : "/api/reports/pad/pdf",
        {
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          label: period.label,
          months: period.months,
        },
        format === "excel" ? "PAD_Account.xlsx" : "PAD_Account.pdf"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PAD / Accounts Report</CardTitle>
        <CardDescription>
          8-sheet workbook (or PDF): summary, month P&amp;L, fuel purchases, PAD ledger, charges,
          money in, invoice reconciliation, and retail prices. Uses the same figures as the Accounts
          dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "month", label: "Month" },
              { id: "financialYear", label: "Financial Year" },
              { id: "range", label: "Date Range" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === option.id
                  ? "bg-ioc-blue text-white"
                  : "bg-ioc-section text-ioc-muted hover:bg-ioc-border/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "month" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Year</Label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm"
              >
                {getYearOptions().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm"
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
          <div className="space-y-2">
            <Label>Financial year (Apr – Mar)</Label>
            <select
              value={fyStartYear}
              onChange={(e) => setFyStartYear(Number(e.target.value))}
              className="flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {period && (
          <p className="text-xs text-ioc-muted">
            Showing: <strong className="text-ioc-navy">{period.label}</strong>
            <span className="block">
              {period.dateFrom} to {period.dateTo}
            </span>
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => exportReport("excel")} disabled={!period || excelLoading || pdfLoading}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {excelLoading ? "Generating Excel..." : "Download Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport("pdf")}
            disabled={!period || excelLoading || pdfLoading}
          >
            <FileText className="mr-2 h-4 w-4" />
            {pdfLoading ? "Generating PDF..." : "Download PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
