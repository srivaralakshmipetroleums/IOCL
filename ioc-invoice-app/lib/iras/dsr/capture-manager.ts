import path from "node:path";
import type { BrowserContext, Page, Response } from "playwright";
import { chromium } from "playwright";
import { JAN_JUL_2026_BATCH_PLAN, buildRetryPlanFromFailedJobs, buildSingleJobPlan, type IrasDsrBatchJob, type IrasDsrBatchPlan } from "@/lib/iras/dsr/batch-plan";
import {
  DSR_BATCH_JOB_MAX_ATTEMPTS,
  DSR_BATCH_JOB_TIMEOUT_MS,
  DSR_CAPTURE_TIMEOUT_MS,
  DSR_REPORT_UPDATE_URL_FRAGMENT,
  IRAS_BROWSER_PROFILE_DIR,
  IRAS_PORTAL_URL,
} from "@/lib/iras/dsr/constants";
import { findLikelyDsrPage, submitDsrBatchJob } from "@/lib/iras/dsr/dsr-form-automation";
import { parseDsrResponse, summarizeDsrRecords } from "@/lib/iras/dsr/parser";
import type { PersistDsrCaptureResult } from "@/lib/iras/dsr/repository";
import type {
  IrasDsrBatchProgress,
  IrasDsrCaptureJobMeta,
  IrasDsrCaptureState,
  IrasDsrCaptureStatus,
  IrasDsrStatusResponse,
} from "@/lib/iras/dsr/types";

type CaptureSuccessHandler = (
  rawResponse: unknown,
  meta?: IrasDsrCaptureJobMeta
) => Promise<PersistDsrCaptureResult | void>;

function emptyBatchProgress(): IrasDsrBatchProgress {
  return {
    active: false,
    totalJobs: 0,
    completedJobs: 0,
    currentJob: null,
    totalRecordsInserted: 0,
    totalRecordsSkipped: 0,
    failedJobs: [],
  };
}

function toPublicStatus(state: IrasDsrCaptureState, browserOpen: boolean): IrasDsrStatusResponse {
  return {
    status: state.status,
    error: state.error,
    startedAt: state.startedAt,
    capturedAt: state.capturedAt,
    savedCaptureId: state.savedCaptureId,
    recordsInserted: state.recordsInserted,
    recordsSkipped: state.recordsSkipped,
    recordCount: state.summary?.recordCount ?? null,
    firstDate: state.summary?.firstDate ?? null,
    lastDate: state.summary?.lastDate ?? null,
    totalCount: state.summary?.totalCount ?? null,
    columns: state.result?.columns ?? null,
    records: state.result?.data ?? null,
    batch: state.batch,
    browserOpen,
    lastCaptureJob: state.lastCaptureJob,
  };
}

function isBrowserOpen(context: BrowserContext | null): boolean {
  if (!context) return false;
  try {
    return context.pages().length > 0;
  } catch {
    return false;
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (typeof record.details === "string" && record.details.trim()) {
      return record.details.trim();
    }
    if (typeof record.hint === "string" && record.hint.trim()) {
      return record.hint.trim();
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function sanitizeError(error: unknown): string {
  return toErrorMessage(error, "IRAS DSR capture failed");
}

function formatBatchJobError(error: unknown): string {
  const raw = sanitizeError(error);

  if (/\b401\b/.test(raw)) {
    return "IRAS session expired (401). Log in again in the Chromium window, then retry failed jobs.";
  }

  if (/timeout.*waitforresponse/i.test(raw)) {
    return "DSR report request was not detected within 3 minutes. Check that month/product are set and Submit triggers a report.";
  }

  if (/response\.data is missing|response is not a json object/i.test(raw)) {
    return "IRAS returned an unexpected DSR response. The selected month may have no report data.";
  }

  if (/could not set month to/i.test(raw)) {
    return raw;
  }

  if (/duplicate key|on conflict/i.test(raw)) {
    return `Unable to store DSR rows in Supabase: ${raw}`;
  }

  return raw;
}

function isRetryableBatchJobError(error: unknown): boolean {
  const raw = sanitizeError(error);
  return /\b401\b/.test(raw) || /timeout.*waitforresponse/i.test(raw);
}

function isDsrReportUpdateRequest(method: string, url: string): boolean {
  return method.toUpperCase() === "POST" && url.includes(DSR_REPORT_UPDATE_URL_FRAGMENT);
}

function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("json");
}

function createWaitingState(startedAt: string): IrasDsrCaptureState {
  return {
    status: "waiting",
    error: null,
    startedAt,
    capturedAt: null,
    savedCaptureId: null,
    recordsInserted: null,
    recordsSkipped: null,
    summary: null,
    result: null,
    batch: null,
    lastCaptureJob: null,
  };
}

function createIdleState(): IrasDsrCaptureState {
  return {
    status: "idle",
    error: null,
    startedAt: null,
    capturedAt: null,
    savedCaptureId: null,
    recordsInserted: null,
    recordsSkipped: null,
    summary: null,
    result: null,
    batch: null,
    lastCaptureJob: null,
  };
}

class IrasDsrCaptureManager {
  private state: IrasDsrCaptureState = createIdleState();

  private context: BrowserContext | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private startPromise: Promise<void> | null = null;
  private listenerPages = new WeakSet<Page>();
  private onCaptureSuccess: CaptureSuccessHandler | null = null;
  private batchRunning = false;
  private batchAbort = false;

  getStatus(): IrasDsrStatusResponse {
    return toPublicStatus(this.state, isBrowserOpen(this.context));
  }

  setOnCaptureSuccess(handler: CaptureSuccessHandler | null): void {
    this.onCaptureSuccess = handler;
  }

  async openBrowser(): Promise<IrasDsrStatusResponse> {
    if (this.batchRunning) {
      return this.getStatus();
    }

    try {
      await this.ensureBrowserContext();
      const page = this.context!.pages()[0] ?? (await this.context!.newPage());
      await page.bringToFront();

      const url = page.url();
      if (url === "about:blank" || !url.includes("iocliras.in")) {
        await page.goto(IRAS_PORTAL_URL, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
      }

      if (this.state.status !== "capturing" && this.state.status !== "waiting") {
        this.state = {
          ...this.state,
          status: "idle",
          error: null,
        };
      }

      return this.getStatus();
    } catch (error) {
      await this.fail(
        error instanceof Error && /net::ERR/i.test(error.message)
          ? "IRAS portal is not reachable"
          : sanitizeError(error),
        false
      );
      return this.getStatus();
    }
  }

  async start(): Promise<IrasDsrStatusResponse> {
    if (this.startPromise) {
      await this.startPromise;
      return this.getStatus();
    }

    if (this.state.status === "waiting" || this.state.status === "capturing") {
      return this.getStatus();
    }

    this.startPromise = this.runStart();
    try {
      await this.startPromise;
      return this.getStatus();
    } finally {
      this.startPromise = null;
    }
  }

  async startJanJul2026Batch(): Promise<IrasDsrStatusResponse> {
    return this.startBatch(JAN_JUL_2026_BATCH_PLAN);
  }

  async startCustomBatch(plan: IrasDsrBatchPlan): Promise<IrasDsrStatusResponse> {
    return this.startBatch(plan);
  }

  async startSelectedJobCapture(job: IrasDsrBatchJob): Promise<IrasDsrStatusResponse> {
    return this.startBatch(buildSingleJobPlan(job));
  }

  async startRetryFailedBatch(): Promise<IrasDsrStatusResponse> {
    const retryPlan = buildRetryPlanFromFailedJobs(this.state.batch?.failedJobs ?? []);
    if (!retryPlan) {
      this.state = {
        ...this.state,
        status: "error",
        error: "No failed batch jobs to retry",
      };
      return this.getStatus();
    }

    return this.startBatch(retryPlan);
  }

  async startBatch(plan: IrasDsrBatchPlan): Promise<IrasDsrStatusResponse> {
    if (this.batchRunning) {
      return this.getStatus();
    }

    if (this.state.status === "waiting" || this.state.status === "capturing") {
      return this.getStatus();
    }

    void this.runBatch(plan).catch((error) => {
      void this.fail(sanitizeError(error), false);
    });

    return this.getStatus();
  }

  async refresh(): Promise<IrasDsrStatusResponse> {
    if (this.startPromise) {
      await this.startPromise;
      return this.getStatus();
    }

    if (this.state.status === "waiting" || this.state.status === "capturing") {
      return this.getStatus();
    }

    if (this.context) {
      this.clearTimeout();
      const startedAt = new Date().toISOString();
      this.state = createWaitingState(startedAt);

      for (const page of this.context.pages()) {
        this.attachResponseListener(page);
      }

      this.armCaptureTimeout();
      return this.getStatus();
    }

    return this.start();
  }

  async stop(): Promise<IrasDsrStatusResponse> {
    this.batchAbort = true;
    this.clearTimeout();
    await this.closeBrowser();
    this.state = createIdleState();
    this.batchRunning = false;
    return this.getStatus();
  }

  private async ensureBrowserContext(): Promise<BrowserContext> {
    if (this.context) {
      for (const page of this.context.pages()) {
        this.attachResponseListener(page);
      }
      return this.context;
    }

    const profileDir = path.join(process.cwd(), IRAS_BROWSER_PROFILE_DIR);
    this.context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 1360, height: 900 },
    });

    this.context.on("page", (page) => {
      this.attachResponseListener(page);
    });

    for (const page of this.context.pages()) {
      this.attachResponseListener(page);
    }

    if (this.context.pages().length === 0) {
      const page = await this.context.newPage();
      await page.goto(IRAS_PORTAL_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }

    return this.context;
  }

  private async runStart(): Promise<void> {
    this.clearTimeout();

    this.state = {
      status: "capturing",
      error: null,
      startedAt: new Date().toISOString(),
      capturedAt: null,
      savedCaptureId: null,
      recordsInserted: null,
      recordsSkipped: null,
      summary: null,
      result: null,
      batch: null,
      lastCaptureJob: null,
    };

    try {
      await this.ensureBrowserContext();
      const page = this.context!.pages()[0] ?? (await this.context!.newPage());
      await page.bringToFront();
      if (page.url() === "about:blank" || !page.url().includes("iocliras.in")) {
        await page.goto(IRAS_PORTAL_URL, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
      }

      this.state = createWaitingState(this.state.startedAt ?? new Date().toISOString());
      this.armCaptureTimeout();
    } catch (error) {
      await this.fail(
        error instanceof Error && /net::ERR/i.test(error.message)
          ? "IRAS portal is not reachable"
          : sanitizeError(error),
        false
      );
    }
  }

  private async runBatch(plan: IrasDsrBatchPlan): Promise<void> {
    this.clearTimeout();
    this.batchAbort = false;
    this.batchRunning = true;

    const startedAt = new Date().toISOString();
    this.state = {
      status: "capturing",
      error: null,
      startedAt,
      capturedAt: null,
      savedCaptureId: null,
      recordsInserted: 0,
      recordsSkipped: 0,
      summary: null,
      result: null,
      batch: {
        active: true,
        totalJobs: plan.jobs.length,
        completedJobs: 0,
        currentJob: null,
        totalRecordsInserted: 0,
        totalRecordsSkipped: 0,
        failedJobs: [],
      },
      lastCaptureJob: null,
    };

    try {
      const context = await this.ensureBrowserContext();
      const page = findLikelyDsrPage(context.pages());

      if (!page) {
        const fallbackPage = context.pages()[0];
        if (fallbackPage) {
          await fallbackPage.bringToFront();
        }
        throw new Error(
          "Browser is open. In the Chromium window, go to Reports → 5 Basic Reports → Daily Sales Report (DSR), then click Auto-capture again."
        );
      }

      await page.bringToFront();
      await page.waitForLoadState("domcontentloaded").catch(() => undefined);
      await page.waitForTimeout(1_500);

      for (const job of plan.jobs) {
        if (this.batchAbort) break;

        this.state.batch = {
          ...this.state.batch!,
          currentJob: job.label,
        };

        try {
          const response = await this.captureBatchJobWithRetry(page, job.label, async () => {
            await submitDsrBatchJob(page, job);
          });

          const processed = await this.processRawResponse(response, false, {
            month: job.month,
            year: job.year,
            product: job.product,
            label: job.label,
          });
          this.state.batch = {
            ...this.state.batch!,
            completedJobs: this.state.batch!.completedJobs + 1,
            totalRecordsInserted:
              this.state.batch!.totalRecordsInserted + (processed.recordsInserted ?? 0),
            totalRecordsSkipped:
              this.state.batch!.totalRecordsSkipped + (processed.recordsSkipped ?? 0),
          };
          this.state.recordsInserted = this.state.batch.totalRecordsInserted;
          this.state.recordsSkipped = this.state.batch.totalRecordsSkipped;
          this.state.result = processed.result;
          this.state.summary = processed.summary;
          this.state.savedCaptureId = processed.savedCaptureId;
          this.state.lastCaptureJob = job.label;
        } catch (error) {
          const message = `${job.label}: ${formatBatchJobError(error)}`;
          this.state.batch = {
            ...this.state.batch!,
            failedJobs: [...this.state.batch!.failedJobs, message],
          };

          if (/\b401\b/.test(sanitizeError(error))) {
            this.batchAbort = true;
          }
        }

        await page.waitForTimeout(800);
      }

      this.batchRunning = false;
      this.state.batch = {
        ...this.state.batch!,
        active: false,
        currentJob: null,
      };

      if (this.batchAbort) {
        this.state.status = "idle";
        return;
      }

      if (this.state.batch.failedJobs.length > 0 && this.state.batch.completedJobs === 0) {
        await this.fail(this.state.batch.failedJobs[0] ?? "Batch capture failed", false);
        return;
      }

      this.state.status = "success";
      this.state.capturedAt = new Date().toISOString();
      this.state.error =
        this.state.batch.failedJobs.length > 0
          ? `${this.state.batch.failedJobs.length} batch job(s) failed`
          : null;
    } catch (error) {
      this.batchRunning = false;
      await this.fail(sanitizeError(error), false);
    }
  }

  private async captureBatchJobWithRetry(
    page: Page,
    jobLabel: string,
    submit: () => Promise<void>
  ): Promise<unknown> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= DSR_BATCH_JOB_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.captureBatchJob(page, jobLabel, submit);
      } catch (error) {
        lastError = error;
        if (attempt >= DSR_BATCH_JOB_MAX_ATTEMPTS || !isRetryableBatchJobError(error)) {
          break;
        }

        await page.waitForTimeout(attempt * 2_000);
      }
    }

    throw lastError;
  }

  private async captureBatchJob(
    page: Page,
    jobLabel: string,
    submit: () => Promise<void>
  ): Promise<unknown> {
    const responsePromise = page.waitForResponse(
      (response) => isDsrReportUpdateRequest(response.request().method(), response.url()),
      { timeout: DSR_BATCH_JOB_TIMEOUT_MS }
    );

    try {
      await submit();
    } catch (error) {
      await responsePromise.catch(() => undefined);
      throw error;
    }

    const response = await responsePromise;
    const status = response.status();
    if (status !== 200) {
      throw new Error(`${jobLabel} returned status ${status}`);
    }

    const contentType = response.headers()["content-type"];
    if (!isJsonContentType(contentType)) {
      throw new Error(`${jobLabel} response is not JSON`);
    }

    return response.json();
  }

  private async processRawResponse(
    rawResponse: unknown,
    updateStatus: boolean,
    meta?: IrasDsrCaptureJobMeta
  ): Promise<{
    recordsInserted: number | null;
    recordsSkipped: number | null;
    summary: IrasDsrCaptureState["summary"];
    result: IrasDsrCaptureState["result"];
    savedCaptureId: string | null;
  }> {
    const parsed = parseDsrResponse(rawResponse);
    const summary = summarizeDsrRecords(parsed.data);

    let savedCaptureId: string | null = null;
    let recordsInserted: number | null = null;
    let recordsSkipped: number | null = null;

    if (this.onCaptureSuccess) {
      const persistResult = await this.onCaptureSuccess(rawResponse, meta);
      if (persistResult) {
        savedCaptureId = persistResult.captureId;
        recordsInserted = persistResult.recordsInserted;
        recordsSkipped = persistResult.recordsSkipped;
      }
    }

    if (updateStatus) {
      this.clearTimeout();
      this.state = {
        ...this.state,
        status: "success",
        error: null,
        capturedAt: new Date().toISOString(),
        savedCaptureId,
        recordsInserted,
        recordsSkipped,
        summary: {
          ...summary,
          totalCount: parsed.totalCount,
        },
        result: parsed,
        lastCaptureJob: meta?.label ?? this.state.lastCaptureJob,
      };
    } else if (meta?.label) {
      this.state = {
        ...this.state,
        lastCaptureJob: meta.label,
      };
    }

    return {
      recordsInserted,
      recordsSkipped,
      summary: {
        ...summary,
        totalCount: parsed.totalCount,
      },
      result: parsed,
      savedCaptureId,
    };
  }

  private armCaptureTimeout(): void {
    this.timeoutHandle = setTimeout(() => {
      if (this.state.status !== "waiting") return;
      void this.fail("DSR request not detected within 30 minutes", false);
    }, DSR_CAPTURE_TIMEOUT_MS);
  }

  private attachResponseListener(page: Page): void {
    if (this.listenerPages.has(page)) return;
    this.listenerPages.add(page);

    page.on("response", (response) => {
      void this.handleResponse(response.request().method(), response.url(), response);
    });
  }

  private async handleResponse(method: string, url: string, response: Response): Promise<void> {
    if (this.batchRunning) return;
    if (!isDsrReportUpdateRequest(method, url)) return;
    if (this.state.status !== "waiting" && this.state.status !== "capturing") return;

    try {
      const status = response.status();
      if (status !== 200) {
        await this.fail(`DSR response status was ${status}, expected 200`, false);
        return;
      }

      const contentType = response.headers()["content-type"];
      if (!isJsonContentType(contentType)) {
        await this.fail("DSR response is not JSON", false);
        return;
      }

      const rawResponse = await response.json();
      await this.processRawResponse(rawResponse, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : sanitizeError(error);
      await this.fail(message.includes("iras_dsr") ? "Unable to store DSR data" : message, false);
    }
  }

  private async fail(message: string, closeBrowser: boolean): Promise<void> {
    this.clearTimeout();
    this.batchRunning = false;
    this.state = {
      ...this.state,
      status: "error",
      error: message,
      batch: this.state.batch
        ? {
            ...this.state.batch,
            active: false,
            currentJob: null,
          }
        : null,
    };

    if (closeBrowser) {
      await this.closeBrowser();
    }
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private async closeBrowser(): Promise<void> {
    if (!this.context) return;

    const context = this.context;
    this.context = null;
    this.listenerPages = new WeakSet<Page>();
    await context.close().catch(() => undefined);
  }
}

declare global {
  var __irasDsrCaptureManager: IrasDsrCaptureManager | undefined;
}

export function getIrasDsrCaptureManager(): IrasDsrCaptureManager {
  if (!globalThis.__irasDsrCaptureManager) {
    globalThis.__irasDsrCaptureManager = new IrasDsrCaptureManager();
  }
  return globalThis.__irasDsrCaptureManager;
}

export function formatCaptureStatusLabel(status: IrasDsrCaptureStatus): string {
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
