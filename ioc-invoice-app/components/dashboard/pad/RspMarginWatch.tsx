"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { buildDashboardQueryString } from "@/lib/dashboard/filters";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { formatCurrencyINR, formatPricePerLitre } from "@/lib/dashboard/format";
import { DEFAULT_MIN_SPREAD_PER_LITRE } from "@/lib/pad/rsp-margin-watch";
import { cn } from "@/lib/utils";

interface RspChangeEvent {
  product: "MS" | "HSD";
  effectiveFrom: string;
  previousPrice: number;
  newPrice: number;
  priceChange: number;
  avgPurchasePerL: number | null;
  spreadBefore: number | null;
  spreadAfter: number | null;
  spreadDelta: number | null;
  belowThreshold: boolean;
  estimatedDailyImpact: number | null;
}

interface RspMarginWatchResponse {
  minSpreadPerLitre: number;
  changes: RspChangeEvent[];
  alerts: RspChangeEvent[];
}

export function RspMarginWatch() {
  const { period } = useDashboardPeriod()!;
  const qs = useMemo(() => buildDashboardQueryString(period), [period]);
  const periodKey = [period.dateFrom, period.dateTo, period.months?.join(",") ?? ""];

  const { data, isLoading, isError } = useQuery<RspMarginWatchResponse>({
    queryKey: ["rsp-margin-watch", ...periodKey],
    queryFn: () =>
      fetchDashboardJson(
        `/api/dashboard/pad/rsp-margin-watch?${qs}&minSpread=${DEFAULT_MIN_SPREAD_PER_LITRE}`
      ),
  });

  if (isLoading) {
    return (
      <div className="ioc-card p-4 text-sm text-ioc-muted">Loading RSP margin watch...</div>
    );
  }

  if (isError || !data) {
    return (
      <div className="ioc-card p-4 text-sm text-ioc-error">Failed to load RSP margin watch.</div>
    );
  }

  const recent = data.changes.slice(0, 6);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-ioc-navy">RSP margin watch</h3>
        <p className="text-sm text-ioc-muted">
          Tracks retail price changes from Gmail/manual RSP and estimates spread vs recent purchase
          cost. Alert when spread drops below {formatPricePerLitre(data.minSpreadPerLitre)}/L.
        </p>
      </div>

      {data.alerts.length > 0 && (
        <div className="rounded-lg border border-ioc-orange/40 bg-ioc-orange-light px-4 py-3 text-sm text-ioc-navy">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ioc-orange" />
            <div>
              <p className="font-medium">
                {data.alerts.length} RSP change{data.alerts.length === 1 ? "" : "s"} below spread
                threshold
              </p>
              <p className="mt-1 text-ioc-muted">
                Review purchase cost and selling price after the latest RSP updates.
              </p>
            </div>
          </div>
        </div>
      )}

      {recent.length === 0 ? (
        <div className="ioc-card p-4 text-sm text-ioc-muted">
          No RSP changes recorded in this period.
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((change) => (
            <div
              key={`${change.product}-${change.effectiveFrom}`}
              className={cn(
                "ioc-card p-4",
                change.belowThreshold && "border-ioc-orange/40 bg-ioc-orange-light/40"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ioc-navy">
                    {change.product} RSP changed on {change.effectiveFrom}
                  </p>
                  <p className="text-sm text-ioc-muted">
                    {formatPricePerLitre(change.previousPrice)}/L →{" "}
                    {formatPricePerLitre(change.newPrice)}/L (
                    {change.priceChange >= 0 ? "+" : ""}
                    {formatPricePerLitre(change.priceChange)}/L)
                  </p>
                </div>
                {change.priceChange >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-ioc-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-ioc-error" />
                )}
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-ioc-muted">Avg purchase: </span>
                  {change.avgPurchasePerL != null
                    ? `${formatPricePerLitre(change.avgPurchasePerL)}/L`
                    : "—"}
                </p>
                <p>
                  <span className="text-ioc-muted">Spread: </span>
                  {change.spreadBefore != null && change.spreadAfter != null ? (
                    <>
                      {formatPricePerLitre(change.spreadBefore)}/L →{" "}
                      {formatPricePerLitre(change.spreadAfter)}/L
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                {change.estimatedDailyImpact != null && (
                  <p className="sm:col-span-2">
                    <span className="text-ioc-muted">Est. daily margin impact: </span>
                    <span className="font-medium">
                      {change.estimatedDailyImpact >= 0 ? "+" : ""}
                      {formatCurrencyINR(change.estimatedDailyImpact)}
                    </span>
                    <span className="text-ioc-muted"> (based on recent day-close sale litres)</span>
                  </p>
                )}
              </div>

              {change.belowThreshold && (
                <p className="mt-2 text-sm font-medium text-ioc-orange">
                  Spread below {formatPricePerLitre(data.minSpreadPerLitre)}/L threshold
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
