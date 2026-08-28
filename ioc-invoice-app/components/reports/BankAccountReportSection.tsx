"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet } from "lucide-react";
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

type BankReportMode = "month" | "financialYear" | "range";

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

export function BankAccountReportSection() {
  const now = new Date();
  const [mode, setMode] = useState<BankReportMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fyStartYear, setFyStartYear] = useState(getFinancialYearStartYear(now));
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-04-01`);
  const [dateTo, setDateTo] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  );
  const [excelLoading, setExcelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => {
    if (mode === "month") return getSelectedMonthPeriod(year, month);
    if (mode === "financialYear") return getFinancialYearPeriod(fyStartYear);
    if (dateFrom && dateTo) return getCustomRangePeriod(dateFrom, dateTo);
    return null;
  }, [mode, year, month, fyStartYear, dateFrom, dateTo]);

  async function exportExcel() {
    if (!period) return;
    setError(null);
    setExcelLoading(true);
    try {
      await downloadReport(
        "/api/reports/bank/excel",
        {
          dateFrom: period.dateFrom,
          dateTo: period.dateTo,
          label: period.label,
          months: period.months,
        },
        "Bank_Statement.xlsx"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExcelLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Statement Report</CardTitle>
        <CardDescription>
          7-sheet workbook: summary, month cash flow, collections, bank ledger, charges &amp;
          outflows, transfer channels, and PAD IOCL reconciliation. Uses the same figures as the
          Bank dashboard.
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
          <div className="ioc-form-grid">
            <div className="ioc-form-field">
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
            <div className="ioc-form-field">
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
          <div className="ioc-form-field">
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
          <p className="text-xs text-ioc-muted">
            Showing: <strong className="text-ioc-navy">{period.label}</strong>
            <span className="block">
              {period.dateFrom} to {period.dateTo}
            </span>
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button onClick={exportExcel} disabled={!period || excelLoading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {excelLoading ? "Generating Excel..." : "Download Excel"}
        </Button>
      </CardContent>
    </Card>
  );
}
