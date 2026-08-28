"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, MonitorPlay, RefreshCw, Square } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  buildBatchCapturePlan,
  buildSingleJob,
  describeBatchPlan,
  DSR_MONTH_OPTIONS,
  DSR_PRODUCT_OPTIONS,
  type IrasDsrBatchCaptureMode,
} from "@/lib/iras/dsr/batch-plan";
import type { IrasDsrProduct } from "@/lib/iras/dsr/batch-plan";
import {
  getFinancialYearOptions,
  getFinancialYearStartYear,
  getRecentMonthOptions,
} from "@/lib/dashboard/period";
import type {
  IrasDsrCaptureStatus,
  IrasDsrStatusResponse,
  IrasDsrStoredData,
} from "@/lib/iras/dsr/types";

const SELECT_CLASS =
  "flex h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm";

const DSR_YEAR_OPTIONS = [2024, 2025, 2026, 2027];

const BATCH_MODE_OPTIONS: Array<{ id: IrasDsrBatchCaptureMode; label: string }> = [
  { id: "range", label: "Month range" },
  { id: "financialYear", label: "Financial year" },
  { id: "months", label: "Multiple months" },
];

function statusBadgeVariant(
  status: IrasDsrCaptureStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "error":
      return "destructive";
    case "waiting":
    case "capturing":
      return "secondary";
    default:
      return "outline";
  }
}

function formatStatusLabel(status: IrasDsrCaptureStatus): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "waiting":
      return "Waiting";
    case "capturing":
      return "Capturing";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      return status;
  }
}

async function fetchCaptureStatus(): Promise<IrasDsrStatusResponse> {
  const response = await fetch("/api/iras/dsr/capture/status");
  if (!response.ok) {
    throw new Error("Unable to read IRAS DSR capture status");
  }
  return response.json();
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text);
  }
}

async function postCaptureApi(
  url: string,
  body?: Record<string, unknown>
): Promise<IrasDsrStatusResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await readJsonResponse<IrasDsrStatusResponse & { error?: string }>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }
  return payload;
}

async function fetchStoredDsrData(options?: {
  month?: number;
  year?: number;
  product?: IrasDsrProduct;
}): Promise<IrasDsrStoredData> {
  const params = new URLSearchParams();
  if (options?.month != null) params.set("month", String(options.month));
  if (options?.year != null) params.set("year", String(options.year));
  if (options?.product) params.set("product", options.product);

  const query = params.toString();
  const response = await fetch(query ? `/api/iras/dsr?${query}` : "/api/iras/dsr");
  if (!response.ok) {
    const payload = await readJsonResponse<{ error?: string }>(response).catch(() => null);
    throw new Error(payload?.error ?? "Unable to load stored DSR data");
  }
  return readJsonResponse<IrasDsrStoredData>(response);
}

export function IrasDsrCapturePage() {
  const [status, setStatus] = useState<IrasDsrStatusResponse | null>(null);
  const [storedData, setStoredData] = useState<IrasDsrStoredData | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [storedDataError, setStoredDataError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isSelectedJobRunning, setIsSelectedJobRunning] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedProduct, setSelectedProduct] = useState<IrasDsrProduct>("MS");
  const [batchMode, setBatchMode] = useState<IrasDsrBatchCaptureMode>("range");
  const [batchProducts, setBatchProducts] = useState<IrasDsrProduct[]>(["MS", "HSD"]);
  const [batchYear, setBatchYear] = useState(2026);
  const [batchStartMonth, setBatchStartMonth] = useState(1);
  const [batchEndMonth, setBatchEndMonth] = useState(7);
  const [batchFyStartYear, setBatchFyStartYear] = useState(() => getFinancialYearStartYear());
  const [batchMonthKeys, setBatchMonthKeys] = useState<string[]>([]);

  const recentMonthOptions = useMemo(() => getRecentMonthOptions(24), []);
  const financialYearOptions = useMemo(() => getFinancialYearOptions(), []);

  const refreshStoredData = useCallback(async () => {
    try {
      const data = await fetchStoredDsrData();
      setStoredData(data);
      setStoredDataError(null);
    } catch (error) {
      setStoredDataError(
        error instanceof Error ? error.message : "Unable to load stored DSR data"
      );
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const nextStatus = await fetchCaptureStatus();
      setStatus(nextStatus);
      if (nextStatus.status === "success" || nextStatus.status === "error") {
        await refreshStoredData();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to refresh capture status");
    }
  }, [refreshStoredData]);

  useEffect(() => {
    void refreshStatus();
    void refreshStoredData();
  }, [refreshStatus, refreshStoredData]);

  const captureStatus = status?.status;

  useEffect(() => {
    if (
      !captureStatus ||
      (captureStatus !== "waiting" && captureStatus !== "capturing" && status?.batch?.active !== true)
    ) {
      return;
    }

    const interval = setInterval(() => {
      void refreshStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [captureStatus, refreshStatus, status?.batch?.active]);

  async function handleOpenBrowser() {
    setActionError(null);
    setIsOpeningBrowser(true);
    try {
      const payload = await postCaptureApi("/api/iras/dsr/capture/browser");
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to open IRAS browser");
    } finally {
      setIsOpeningBrowser(false);
    }
  }

  async function handleStartCapture() {
    setActionError(null);
    setIsStarting(true);
    try {
      const payload = await postCaptureApi("/api/iras/dsr/capture/start");
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to start IRAS DSR capture");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleRefreshDsr() {
    setActionError(null);
    setIsRefreshing(true);
    try {
      const payload = await postCaptureApi("/api/iras/dsr/capture/refresh");
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to refresh IRAS DSR capture");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleStartBatchCapture() {
    const plan = buildBatchCapturePlan({
      mode: batchMode,
      products: batchProducts,
      year: batchYear,
      startMonth: batchStartMonth,
      endMonth: batchEndMonth,
      fyStartYear: batchFyStartYear,
      monthKeys: batchMonthKeys,
    });

    if (!plan) {
      setActionError("Choose at least one product and a valid batch period");
      return;
    }

    setActionError(null);
    setIsBatchRunning(true);
    try {
      const payload = await postCaptureApi("/api/iras/dsr/capture/start", {
        batchCapture: {
          mode: batchMode,
          products: batchProducts,
          year: batchYear,
          startMonth: batchStartMonth,
          endMonth: batchEndMonth,
          fyStartYear: batchFyStartYear,
          monthKeys: batchMonthKeys,
        },
      });
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to start batch DSR capture");
    } finally {
      setIsBatchRunning(false);
    }
  }

  function toggleBatchProduct(product: IrasDsrProduct) {
    setBatchProducts((current) => {
      if (current.includes(product)) {
        return current.length === 1 ? current : current.filter((entry) => entry !== product);
      }
      return [...current, product];
    });
  }

  function toggleBatchMonth(key: string) {
    setBatchMonthKeys((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  }

  async function handleSelectedJobCapture() {
    setActionError(null);
    setIsSelectedJobRunning(true);
    try {
      const payload = await postCaptureApi("/api/iras/dsr/capture/start", {
        job: {
          month: selectedMonth,
          year: selectedYear,
          product: selectedProduct,
        },
      });
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to capture selected DSR job");
    } finally {
      setIsSelectedJobRunning(false);
    }
  }

  async function handleRetryFailedBatch() {
    setActionError(null);
    setIsBatchRunning(true);
    try {
      const payload = await postCaptureApi("/api/iras/dsr/capture/start", { retryFailed: true });
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to retry failed batch jobs");
    } finally {
      setIsBatchRunning(false);
    }
  }

  async function handleStopCapture() {
    setActionError(null);
    setIsStopping(true);
    try {
      const response = await fetch("/api/iras/dsr/capture/stop", { method: "POST" });
      const payload = await readJsonResponse<IrasDsrStatusResponse>(response);
      if (!response.ok) {
        throw new Error("Unable to stop IRAS DSR capture");
      }
      setStatus(payload);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to stop IRAS DSR capture");
    } finally {
      setIsStopping(false);
    }
  }

  function handleExportJson() {
    const rawResponse = storedData?.latestCapture?.rawResponse;
    if (!rawResponse) return;

    const blob = new Blob([JSON.stringify(rawResponse, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `iras-dsr-capture-${storedData.latestCapture?.capturedAt ?? "latest"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const selectedJob = useMemo(
    () => buildSingleJob({ month: selectedMonth, year: selectedYear, product: selectedProduct }),
    [selectedMonth, selectedProduct, selectedYear]
  );

  const batchPlanPreview = useMemo(
    () =>
      buildBatchCapturePlan({
        mode: batchMode,
        products: batchProducts,
        year: batchYear,
        startMonth: batchStartMonth,
        endMonth: batchEndMonth,
        fyStartYear: batchFyStartYear,
        monthKeys: batchMonthKeys,
      }),
    [
      batchEndMonth,
      batchFyStartYear,
      batchMode,
      batchMonthKeys,
      batchProducts,
      batchStartMonth,
      batchYear,
    ]
  );

  const isActive =
    status?.status === "waiting" ||
    status?.status === "capturing" ||
    status?.batch?.active === true;
  const isCaptureBusy = isActive || isSelectedJobRunning || isBatchRunning;
  const displayError = actionError ?? status?.error ?? null;
  const latestCapture = storedData?.latestCapture;

  const instructions = useMemo(
    () => [
      "Click Open IRAS Browser to launch Chromium (it stays open until you click Close browser).",
      "Log into IRAS manually if prompted.",
      "Open Reports → 5 Basic Reports → Daily Sales Report (DSR).",
      "Pick month, year, and product below to capture and verify one report at a time.",
      "Use batch capture for a month range, financial year (Apr–Mar), or selected months.",
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle>IRAS DSR Capture</PageTitle>
        <Button asChild variant="outline">
          <Link href="/dashboard?tab=dsr">
            <ExternalLink className="h-4 w-4" />
            View DSR dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="h-5 w-5" />
            Capture IRAS DSR
          </CardTitle>
          <CardDescription>
            Captured DSR data is stored as raw IRAS JSON plus separate daily records. No IRAS
            credentials are stored in the app or database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={statusBadgeVariant(status?.status ?? "idle")}>
              {formatStatusLabel(status?.status ?? "idle")}
            </Badge>
            <Badge variant={status?.browserOpen ? "default" : "outline"}>
              Browser: {status?.browserOpen ? "Open" : "Closed"}
            </Badge>
            <Button onClick={() => void refreshStatus()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh status
            </Button>
          </div>

          <div className="rounded-md border bg-muted/20 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Verify a single month / product</p>
              <p className="text-xs text-muted-foreground mt-1">
                Automates the IRAS DSR form for{" "}
                <span className="font-medium text-foreground">{selectedJob.label}</span>. The DSR
                page must already be open in the IRAS browser.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Month</Label>
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(Number(event.target.value))}
                  className={SELECT_CLASS}
                  disabled={isCaptureBusy}
                >
                  {DSR_MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(Number(event.target.value))}
                  className={SELECT_CLASS}
                  disabled={isCaptureBusy}
                >
                  {DSR_YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Product</Label>
                <select
                  value={selectedProduct}
                  onChange={(event) => setSelectedProduct(event.target.value as IrasDsrProduct)}
                  className={SELECT_CLASS}
                  disabled={isCaptureBusy}
                >
                  {DSR_PRODUCT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void handleSelectedJobCapture()}
                disabled={isCaptureBusy}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isSelectedJobRunning ? "Capturing..." : `Capture ${selectedJob.label}`}
              </Button>
              <p className="text-sm text-muted-foreground">
                Captured data appears in the{" "}
                <Link href="/dashboard?tab=dsr" className="font-medium text-ioc-blue underline">
                  DSR dashboard
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/20 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Batch capture</p>
              <p className="text-xs text-muted-foreground mt-1">
                Runs MS and/or HSD for each selected month. The DSR page must already be open in
                the IRAS browser.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {BATCH_MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBatchMode(option.id)}
                  disabled={isCaptureBusy}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    batchMode === option.id
                      ? "bg-ioc-blue text-white"
                      : "bg-white text-ioc-muted hover:bg-ioc-border/60 border border-ioc-border"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Products</Label>
              <div className="flex flex-wrap gap-4">
                {DSR_PRODUCT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={batchProducts.includes(option.value)}
                      onChange={() => toggleBatchProduct(option.value)}
                      disabled={isCaptureBusy}
                      className="rounded border-ioc-border"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {batchMode === "range" && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">From month</Label>
                  <select
                    value={batchStartMonth}
                    onChange={(event) => setBatchStartMonth(Number(event.target.value))}
                    className={SELECT_CLASS}
                    disabled={isCaptureBusy}
                  >
                    {DSR_MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To month</Label>
                  <select
                    value={batchEndMonth}
                    onChange={(event) => setBatchEndMonth(Number(event.target.value))}
                    className={SELECT_CLASS}
                    disabled={isCaptureBusy}
                  >
                    {DSR_MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Year</Label>
                  <select
                    value={batchYear}
                    onChange={(event) => setBatchYear(Number(event.target.value))}
                    className={SELECT_CLASS}
                    disabled={isCaptureBusy}
                  >
                    {DSR_YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {batchMode === "financialYear" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Financial year (Apr – Mar)</Label>
                <select
                  value={batchFyStartYear}
                  onChange={(event) => setBatchFyStartYear(Number(event.target.value))}
                  className={SELECT_CLASS}
                  disabled={isCaptureBusy}
                >
                  {financialYearOptions.map((startYear) => (
                    <option key={startYear} value={startYear}>
                      FY {startYear}-{String(startYear + 1).slice(-2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {batchMode === "months" && (
              <div className="max-h-44 space-y-2 overflow-y-auto rounded-[10px] border border-ioc-border bg-white p-3">
                {recentMonthOptions.map((option) => (
                  <label key={option.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={batchMonthKeys.includes(option.key)}
                      onChange={() => toggleBatchMonth(option.key)}
                      disabled={isCaptureBusy}
                      className="rounded border-ioc-border"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {batchPlanPreview
                ? `Ready: ${describeBatchPlan(batchPlanPreview)}`
                : batchMode === "months"
                  ? "Select one or more months above, then click Start batch capture below."
                  : "Choose products and a valid period, then click Start batch capture below."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => void handleOpenBrowser()}
              disabled={isOpeningBrowser || isCaptureBusy}
            >
              <MonitorPlay className="mr-2 h-4 w-4" />
              {isOpeningBrowser ? "Opening..." : "Open IRAS Browser"}
            </Button>
            <Button
              onClick={() => void handleStartBatchCapture()}
              disabled={isBatchRunning || isCaptureBusy}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isBatchRunning
                ? "Batch running..."
                : batchPlanPreview
                  ? `Start batch (${batchPlanPreview.jobs.length} jobs)`
                  : "Start batch capture"}
            </Button>
            <Button onClick={() => void handleStartCapture()} disabled={isStarting || isCaptureBusy} variant="secondary">
              {isStarting ? "Starting..." : "Capture IRAS DSR (manual)"}
            </Button>
            <Button
              onClick={() => void handleRefreshDsr()}
              variant="secondary"
              disabled={isRefreshing || isCaptureBusy}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {isRefreshing ? "Refreshing..." : "Refresh DSR"}
            </Button>
            {status?.batch && !status.batch.active && status.batch.failedJobs.length > 0 && (
              <Button
                onClick={() => void handleRetryFailedBatch()}
                variant="secondary"
                disabled={isBatchRunning || isCaptureBusy}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry {status.batch.failedJobs.length} failed job
                {status.batch.failedJobs.length === 1 ? "" : "s"}
              </Button>
            )}
            <Button
              onClick={() => void handleStopCapture()}
              variant="outline"
              disabled={isStopping || !status?.browserOpen}
            >
              <Square className="mr-2 h-4 w-4" />
              {isStopping ? "Closing..." : "Close browser"}
            </Button>
            {latestCapture?.rawResponse != null && (
              <Button onClick={handleExportJson} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export raw JSON
              </Button>
            )}
          </div>

          {storedDataError && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
              {storedDataError}
            </div>
          )}

          {displayError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {displayError}
            </div>
          )}

          {status?.batch?.active && (
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
              <p>
                Batch progress: {status.batch.completedJobs}/{status.batch.totalJobs}
              </p>
              {status.batch.currentJob && (
                <p className="text-muted-foreground">Current: {status.batch.currentJob}</p>
              )}
              <p className="text-muted-foreground">
                Stored {status.batch.totalRecordsInserted} new record
                {status.batch.totalRecordsInserted === 1 ? "" : "s"}
                {status.batch.totalRecordsSkipped
                  ? `, skipped ${status.batch.totalRecordsSkipped} duplicate date(s)`
                  : ""}
              </p>
            </div>
          )}

          {status?.batch && !status.batch.active && status.batch.failedJobs.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Some batch jobs failed:</p>
              <ul className="mt-2 list-disc pl-5">
                {status.batch.failedJobs.map((job) => (
                  <li key={job}>{job}</li>
                ))}
              </ul>
            </div>
          )}

          {status?.status === "success" &&
            (status.recordsInserted != null || status.recordsSkipped != null) && (
              <p className="text-sm text-muted-foreground">
                Latest capture stored {status.recordsInserted ?? 0} new record
                {(status.recordsInserted ?? 0) === 1 ? "" : "s"}
                {status.recordsSkipped ? `, skipped ${status.recordsSkipped} duplicate date(s)` : ""}.
              </p>
            )}

          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
