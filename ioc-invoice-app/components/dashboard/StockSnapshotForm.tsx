"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, ChevronDown } from "lucide-react";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { formatIndianNumber } from "@/lib/dashboard/format";
import {
  getFinancialYearOptions,
  getFinancialYearStartYear,
  MONTHS,
} from "@/lib/dashboard/period";
import { getYearOptions } from "@/lib/invoices/period-utils";
import {
  buildBoundaryStockSnapshots,
  parseLitresInput,
  periodKeyForFinancialYear,
  periodKeyForMonth,
} from "@/lib/stock/build-snapshots";
import type { StockProduct, StockScope, StockSnapshotKind, StockSnapshotRow } from "@/lib/stock/types";
import { cn } from "@/lib/utils";

function emptyFields() {
  return { msOpening: "", msClosing: "", hsdOpening: "", hsdClosing: "" };
}

function savedLitres(
  rows: StockSnapshotRow[],
  product: StockProduct,
  kind: StockSnapshotKind
): string {
  const row = rows.find((item) => item.product === product && item.snapshot_kind === kind);
  if (!row) return "—";
  return `${formatIndianNumber(row.quantity_litres)} L`;
}

export function StockSnapshotForm() {
  const queryClient = useQueryClient();
  const { period } = useDashboardPeriod()!;
  const now = new Date();

  const [scope, setScope] = useState<StockScope>(
    period.mode === "financialYear" ? "financial_year" : "month"
  );
  const [year, setYear] = useState(() => Number(period.dateFrom.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(period.dateFrom.slice(5, 7)));
  const [fyStartYear, setFyStartYear] = useState(() =>
    period.mode === "financialYear"
      ? Number(period.dateFrom.slice(0, 4))
      : getFinancialYearStartYear(now)
  );
  const [fields, setFields] = useState(emptyFields);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const periodKey =
    scope === "month" ? periodKeyForMonth(year, month) : periodKeyForFinancialYear(fyStartYear);

  const { data: snapshots = [] } = useQuery<StockSnapshotRow[]>({
    queryKey: ["stock-snapshots"],
    queryFn: () => fetchDashboardJson("/api/stock-snapshots"),
  });

  const savedRows = useMemo(
    () => snapshots.filter((row) => row.scope === scope && row.period_key === periodKey),
    [snapshots, scope, periodKey]
  );
  const hasSavedStock = savedRows.length > 0;

  useEffect(() => {
    setFields(emptyFields());
    setConfirmReplace(false);
    setMessage(null);
  }, [scope, periodKey]);

  const periodLabel =
    scope === "month"
      ? `${MONTHS.find((item) => item.value === month)?.label ?? month} ${year}`
      : `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const snapshotsToSave = buildBoundaryStockSnapshots(scope, periodKey, {
        msOpening: parseLitresInput(fields.msOpening),
        msClosing: parseLitresInput(fields.msClosing),
        hsdOpening: parseLitresInput(fields.hsdOpening),
        hsdClosing: parseLitresInput(fields.hsdClosing),
      });
      if (snapshotsToSave.length === 0) {
        throw new Error("Enter at least one stock value in litres.");
      }

      const res = await fetch("/api/stock-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshots: snapshotsToSave }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Failed to save stock");
      }
      return snapshotsToSave.length;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["stock-snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["business-dashboard"] });
      setFields(emptyFields());
      setConfirmReplace(false);
      setMessage(`Saved ${saved} stock value${saved === 1 ? "" : "s"} for ${periodLabel}.`);
    },
    onError: (err: Error) => setMessage(err.message),
  });

  function updateField(key: keyof ReturnType<typeof emptyFields>, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setMessage(null);
    if (hasSavedStock) setConfirmReplace(false);
  }

  function handleSaveClick() {
    setMessage(null);
    if (hasSavedStock && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    saveMutation.mutate();
  }

  return (
    <section className="ioc-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-5 text-left transition-colors hover:bg-ioc-surface/30"
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-ioc-muted transition-transform",
            expanded && "rotate-180"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-ioc-navy">
            <Droplets className="h-4 w-4 shrink-0" />
            Opening and closing stock
          </div>
          {!expanded && (
            <p className="mt-1 text-xs text-ioc-muted">
              {hasSavedStock
                ? `${periodLabel} · Stock saved — tap to view or edit`
                : `${periodLabel} · No stock saved — tap to enter values`}
            </p>
          )}
          {expanded && (
            <p className="mt-1 text-xs text-ioc-muted">
              Enter tank stock in litres for a month or a financial year. Saved values are used in
              profit and stock reconciliation.
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-ioc-border px-5 pb-5 pt-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "month" as const, label: "Monthly" },
            { id: "financial_year" as const, label: "Yearly (FY)" },
          ]
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setScope(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              scope === option.id
                ? "bg-ioc-blue text-white"
                : "bg-ioc-section text-ioc-muted hover:bg-ioc-border/60"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {scope === "month" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Year</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm"
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 sm:max-w-xs">
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

      {hasSavedStock && (
        <div className="rounded-lg border border-ioc-orange/30 bg-ioc-orange-light px-4 py-3 text-sm text-ioc-navy">
          <p className="font-medium">Stock is already saved for {periodLabel}.</p>
          <p className="mt-1 text-ioc-muted">
            Enter new values only if you want to change them. Saving will replace the stored
            opening and closing stock.
          </p>
          <div className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
            <p>Petrol opening: {savedLitres(savedRows, "MS", "opening")}</p>
            <p>Petrol closing: {savedLitres(savedRows, "MS", "closing")}</p>
            <p>Diesel opening: {savedLitres(savedRows, "HSD", "opening")}</p>
            <p>Diesel closing: {savedLitres(savedRows, "HSD", "closing")}</p>
          </div>
        </div>
      )}

      <div className="ioc-table-wrap">
        <table className="ioc-table-3col">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ioc-muted">
              <th className="w-[28%] pb-2 font-semibold">Fuel</th>
              <th className="w-[36%] pb-2 font-semibold">Opening (L)</th>
              <th className="w-[36%] pb-2 font-semibold">Closing (L)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1.5 pr-3 text-sm text-ioc-navy">Petrol (MS)</td>
              <td className="py-1.5 pr-3">
                <Input
                  inputMode="decimal"
                  value={fields.msOpening}
                  onChange={(e) => updateField("msOpening", e.target.value)}
                  placeholder="Enter litres"
                />
              </td>
              <td className="py-1.5">
                <Input
                  inputMode="decimal"
                  value={fields.msClosing}
                  onChange={(e) => updateField("msClosing", e.target.value)}
                  placeholder="Enter litres"
                />
              </td>
            </tr>
            <tr>
              <td className="py-1.5 pr-3 text-sm text-ioc-navy">Diesel (HSD)</td>
              <td className="py-1.5 pr-3">
                <Input
                  inputMode="decimal"
                  value={fields.hsdOpening}
                  onChange={(e) => updateField("hsdOpening", e.target.value)}
                  placeholder="Enter litres"
                />
              </td>
              <td className="py-1.5">
                <Input
                  inputMode="decimal"
                  value={fields.hsdClosing}
                  onChange={(e) => updateField("hsdClosing", e.target.value)}
                  placeholder="Enter litres"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {confirmReplace && (
        <div className="rounded-lg border border-ioc-orange/40 bg-white px-4 py-3 text-sm text-ioc-navy">
          Values are already saved for {periodLabel}. Click{" "}
          <strong>Replace saved stock</strong> only if you want to change them.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {confirmReplace ? (
          <>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Replace saved stock"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmReplace(false);
                setFields(emptyFields());
              }}
            >
              Keep existing values
            </Button>
          </>
        ) : (
          <Button type="button" onClick={handleSaveClick} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : `Save ${periodLabel} stock`}
          </Button>
        )}
        {message && <p className="text-sm text-ioc-muted">{message}</p>}
      </div>
        </div>
      )}
    </section>
  );
}
