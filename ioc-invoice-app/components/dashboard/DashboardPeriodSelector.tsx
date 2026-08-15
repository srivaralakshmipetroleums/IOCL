"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import {
  getCurrentMonthPeriod,
  getCustomRangePeriod,
  getFinancialYearOptions,
  getFinancialYearPeriod,
  getFinancialYearStartYear,
  getLast6MonthsPeriod,
  getMultiMonthPeriod,
  getRecentMonthOptions,
  getSelectedMonthPeriod,
  MONTHS,
  type DashboardPeriodMode,
} from "@/lib/dashboard/period";
import { getYearOptions } from "@/lib/invoices/period-utils";

const MODE_OPTIONS: Array<{ id: DashboardPeriodMode; label: string }> = [
  { id: "currentMonth", label: "This Month" },
  { id: "month", label: "Month" },
  { id: "last6months", label: "Last 6 Months" },
  { id: "financialYear", label: "Financial Year" },
  { id: "range", label: "Date Range" },
  { id: "multiMonth", label: "Multiple Months" },
];

export function DashboardPeriodSelector() {
  const { period, setPeriod } = useDashboardPeriod()!;
  const now = new Date();

  const [mode, setMode] = useState<DashboardPeriodMode>(period.mode);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fyStartYear, setFyStartYear] = useState(getFinancialYearStartYear(now));
  const [dateFrom, setDateFrom] = useState(period.dateFrom);
  const [dateTo, setDateTo] = useState(period.dateTo);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(period.months ?? []);

  useEffect(() => {
    if (mode === "currentMonth") {
      setPeriod(getCurrentMonthPeriod());
      return;
    }

    if (mode === "month") {
      setPeriod(getSelectedMonthPeriod(year, month));
      return;
    }

    if (mode === "last6months") {
      setPeriod(getLast6MonthsPeriod());
      return;
    }

    if (mode === "financialYear") {
      setPeriod(getFinancialYearPeriod(fyStartYear));
      return;
    }

    if (mode === "range" && dateFrom && dateTo) {
      setPeriod(getCustomRangePeriod(dateFrom, dateTo));
      return;
    }

    if (mode === "multiMonth") {
      const multi = getMultiMonthPeriod(selectedMonths);
      if (multi) setPeriod(multi);
    }
  }, [mode, year, month, fyStartYear, dateFrom, dateTo, selectedMonths, setPeriod]);

  function toggleMonth(key: string) {
    setSelectedMonths((current) =>
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    );
  }

  return (
    <div className="w-full space-y-3 sm:min-w-[320px] sm:max-w-xl">
      <Label className="text-xs font-semibold uppercase tracking-wide text-ioc-muted">Period</Label>

      <div className="flex flex-wrap gap-2">
        {MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setMode(option.id);
              if (option.id === "multiMonth" && selectedMonths.length === 0) {
                const current = getCurrentMonthPeriod();
                setSelectedMonths([current.dateFrom.slice(0, 7)]);
              }
            }}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Year</Label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm"
            >
              {getYearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {mode === "financialYear" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Financial year (Apr – Mar)</Label>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {mode === "multiMonth" && (
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-[10px] border border-ioc-border bg-white p-3">
          {getRecentMonthOptions().map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedMonths.includes(option.key)}
                onChange={() => toggleMonth(option.key)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}

      <p className="text-xs text-ioc-muted">
        Showing: <strong className="text-ioc-navy">{period.label}</strong>
        <span className="block">{period.dateFrom} to {period.dateTo}</span>
      </p>
    </div>
  );
}
