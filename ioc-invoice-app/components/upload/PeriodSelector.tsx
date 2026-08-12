"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getMonthDateRange,
  getYearDateRange,
  getCustomDateRange,
  MONTHS,
  getYearOptions,
  type PeriodMode,
  type DatePeriod,
} from "@/lib/invoices/period-utils";

interface PeriodCoverage {
  existingCount: number;
  hasExistingData: boolean;
  message: string;
}

interface PeriodSelectorProps {
  onChange: (period: DatePeriod) => void;
}

export function PeriodSelector({ onChange }: PeriodSelectorProps) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const period = useMemo((): DatePeriod => {
    if (mode === "month") return getMonthDateRange(year, month);
    if (mode === "year") return getYearDateRange(year);
    if (dateFrom && dateTo) return getCustomDateRange(dateFrom, dateTo);
    return getMonthDateRange(year, month);
  }, [mode, year, month, dateFrom, dateTo]);

  useEffect(() => {
    onChange(period);
  }, [period, onChange]);

  const { data: coverage } = useQuery<PeriodCoverage>({
    queryKey: ["period-coverage", period.dateFrom, period.dateTo],
    queryFn: () =>
      fetch(`/api/upload/period-coverage?dateFrom=${period.dateFrom}&dateTo=${period.dateTo}`).then(
        (r) => r.json()
      ),
    enabled: Boolean(period.dateFrom && period.dateTo),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["month", "year", "range"] as PeriodMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {m === "month" ? "Month" : m === "year" ? "Year" : "Date Range"}
          </button>
        ))}
      </div>

      {mode === "month" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Month</Label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {getYearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {mode === "year" && (
        <div className="space-y-2">
          <Label>Year</Label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
          >
            {getYearOptions().map((y) => (
              <option key={y} value={y}>{y}</option>
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

      <div className="rounded-md bg-muted p-3 text-sm">
        <p>
          Selected period: <strong>{period.label}</strong>
        </p>
        <p className="text-muted-foreground">
          {period.dateFrom} → {period.dateTo} (exclusive end)
        </p>
      </div>

      {coverage && (
        <div className="flex items-start gap-2 text-sm">
          {coverage.hasExistingData ? (
            <Badge variant="warning">{coverage.existingCount} already extracted</Badge>
          ) : (
            <Badge variant="secondary">No data for this period</Badge>
          )}
          <span className="text-muted-foreground">{coverage.message}</span>
        </div>
      )}
    </div>
  );
}
