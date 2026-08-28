"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarRange, Mail, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PageTitle } from "@/components/layout/PageTitle";
import {
  getLastNCalendarMonths,
  getMonthChunksInDateRange,
  type InclusiveDateRangeChunk,
} from "@/lib/invoices/period-utils";

interface GmailStatus {
  connected: boolean;
  gmailEmail: string | null;
  oauthConfigured: boolean;
  claudeConfigured: boolean;
  config: {
    sender: string;
    subject: string;
    requireAttachment: boolean;
  };
  rspConfig?: {
    sender: string;
    subject: string;
    customerCode: string;
  };
}

interface RspFetchResult {
  jobId: string;
  query: string;
  emailsFound: number;
  pricesUpserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface FetchResult {
  jobId: string;
  query: string;
  emailsFound: number;
  pdfsDownloaded: number;
  invoicesCompleted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface BulkFetchResult {
  chunksProcessed: number;
  emailsFound: number;
  pdfsDownloaded: number;
  invoicesCompleted: number;
  skipped: number;
  failed: number;
  errors: string[];
  chunkResults: Array<{
    label: string;
    success: boolean;
    result?: FetchResult;
    error?: string;
  }>;
  dateFrom: string;
  dateTo: string;
}

interface FetchProgress {
  label: string;
  chunkCurrent?: number;
  chunkTotal?: number;
  emailCurrent?: number;
  emailTotal?: number;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateTo(): string {
  return formatIsoDate(new Date());
}

function getDefaultDateFrom(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getThisMonthRange(): { dateFrom: string; dateTo: string } {
  return { dateFrom: getDefaultDateFrom(), dateTo: getDefaultDateTo() };
}

function getLastNMonthsRange(count: number): { dateFrom: string; dateTo: string } {
  const months = getLastNCalendarMonths(count);
  const first = months[0];
  return {
    dateFrom: `${first.year}-${String(first.month).padStart(2, "0")}-01`,
    dateTo: getDefaultDateTo(),
  };
}

async function postGmailApi<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: T & { error?: string };

  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      text.trim().slice(0, 200) || `Request failed (${res.status} ${res.statusText})`
    );
  }

  if (!res.ok) {
    throw new Error(data.error || text.trim().slice(0, 200) || `Request failed (${res.status})`);
  }

  return data;
}

interface GmailScanResponse {
  jobId: string;
  query: string;
  emailsFound: number;
  skippedAlready: number;
  pendingMessageIds: string[];
}

interface GmailProcessResponse {
  pdfsDownloaded: number;
  invoicesCompleted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface GmailRspProcessResponse {
  pricesUpserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function fetchRspDateRangeChunk(
  dateFrom: string,
  dateTo: string,
  onProgress?: (progress: FetchProgress) => void
): Promise<RspFetchResult> {
  const scan = await postGmailApi<GmailScanResponse>("/api/gmail/fetch-rsp/scan", {
    dateFrom,
    dateTo,
  });

  const result: RspFetchResult = {
    jobId: scan.jobId,
    query: scan.query,
    emailsFound: scan.emailsFound,
    pricesUpserted: 0,
    skipped: scan.skippedAlready,
    failed: 0,
    errors: [],
  };

  const total = scan.pendingMessageIds.length;

  if (total === 0) {
    onProgress?.({
      label: `${scan.emailsFound} emails already imported`,
      emailCurrent: 0,
      emailTotal: 0,
    });
  }

  for (let i = 0; i < scan.pendingMessageIds.length; i++) {
    const messageId = scan.pendingMessageIds[i];
    onProgress?.({
      label: `Processing ${i + 1} of ${total} new emails (${scan.skippedAlready} already imported)`,
      emailCurrent: i + 1,
      emailTotal: total,
    });

    try {
      const partial = await postGmailApi<GmailRspProcessResponse>(
        "/api/gmail/fetch-rsp/process",
        { messageId }
      );

      result.pricesUpserted += partial.pricesUpserted;
      result.skipped += partial.skipped;
      result.failed += partial.failed;
      result.errors.push(...partial.errors);
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : "Processing failed");
    }
  }

  await postGmailApi("/api/gmail/fetch-rsp/finalize", {
    jobId: scan.jobId,
    emailsFound: result.emailsFound,
    pricesUpserted: result.pricesUpserted,
    skipped: result.skipped,
    failed: result.failed,
  });

  return result;
}

async function fetchDateRangeChunk(
  dateFrom: string,
  dateTo: string,
  onProgress?: (progress: FetchProgress) => void
): Promise<FetchResult> {
  const scan = await postGmailApi<GmailScanResponse>("/api/gmail/fetch/scan", {
    dateFrom,
    dateTo,
  });

  const result: FetchResult = {
    jobId: scan.jobId,
    query: scan.query,
    emailsFound: scan.emailsFound,
    pdfsDownloaded: 0,
    invoicesCompleted: 0,
    skipped: scan.skippedAlready,
    failed: 0,
    errors: [],
  };

  const total = scan.pendingMessageIds.length;

  for (let i = 0; i < scan.pendingMessageIds.length; i++) {
    const messageId = scan.pendingMessageIds[i];
    onProgress?.({
      label: `Processing email ${i + 1} of ${total}`,
      emailCurrent: i + 1,
      emailTotal: total,
    });

    try {
      const partial = await postGmailApi<GmailProcessResponse>("/api/gmail/fetch/process", {
        jobId: scan.jobId,
        messageId,
        dateFrom,
        dateTo,
        extractorMode: "claude",
      });

      result.pdfsDownloaded += partial.pdfsDownloaded;
      result.invoicesCompleted += partial.invoicesCompleted;
      result.skipped += partial.skipped;
      result.failed += partial.failed;
      result.errors.push(...partial.errors);
    } catch (err) {
      result.failed++;
      result.errors.push(err instanceof Error ? err.message : "Processing failed");
    }
  }

  await postGmailApi("/api/gmail/fetch/finalize", {
    jobId: scan.jobId,
    emailsFound: result.emailsFound,
    pdfsDownloaded: result.pdfsDownloaded,
    invoicesCompleted: result.invoicesCompleted,
    skipped: result.skipped,
    failed: result.failed,
  });

  return result;
}

export function GmailPage({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams();
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo, setDateTo] = useState(getDefaultDateTo);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [rspResult, setRspResult] = useState<RspFetchResult | null>(null);
  const [rspFetching, setRspFetching] = useState(false);
  const [rspProgress, setRspProgress] = useState<FetchProgress | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkFetchResult | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [rspError, setRspError] = useState("");

  const { data: status, refetch } = useQuery<GmailStatus>({
    queryKey: ["gmail-status"],
    queryFn: () => fetch("/api/gmail/status").then((r) => r.json()),
  });

  useEffect(() => {
    const error = searchParams.get("error");
    const connected = searchParams.get("connected");
    if (error) setFetchError(decodeURIComponent(error));
    if (connected) refetch();
  }, [searchParams, refetch]);

  async function handleConnect() {
    window.location.href = "/api/gmail/auth";
  }

  async function handleDisconnect() {
    await fetch("/api/gmail/disconnect", { method: "DELETE" });
    refetch();
  }

  function validateDateRange(): string | null {
    if (!dateFrom || !dateTo) return "Please select both start and end dates.";
    if (dateFrom > dateTo) return "Start date must be on or before end date.";
    return null;
  }

  function applyPreset(range: { dateFrom: string; dateTo: string }) {
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
    setFetchError("");
  }

  async function runRangeFetch(
    from: string,
    to: string,
    chunks: InclusiveDateRangeChunk[]
  ) {
    setFetching(true);
    setFetchError("");
    setResult(null);
    setBulkResult(null);

    if (chunks.length === 1) {
      try {
        const data = await fetchDateRangeChunk(chunks[0].dateFrom, chunks[0].dateToInclusive, (progress) => {
          setFetchProgress({
            ...progress,
            label: `${chunks[0].label} — ${progress.label}`,
          });
        });
        setResult(data);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Fetch failed");
      } finally {
        setFetching(false);
        setFetchProgress(null);
      }
      return;
    }

    const aggregated: BulkFetchResult = {
      chunksProcessed: 0,
      emailsFound: 0,
      pdfsDownloaded: 0,
      invoicesCompleted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      chunkResults: [],
      dateFrom: from,
      dateTo: to,
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          const chunkResult = await fetchDateRangeChunk(
            chunk.dateFrom,
            chunk.dateToInclusive,
            (progress) => {
              setFetchProgress({
                ...progress,
                label: `${chunk.label} — ${progress.label}`,
                chunkCurrent: i + 1,
                chunkTotal: chunks.length,
              });
            }
          );

          aggregated.chunksProcessed++;
          aggregated.emailsFound += chunkResult.emailsFound;
          aggregated.pdfsDownloaded += chunkResult.pdfsDownloaded;
          aggregated.invoicesCompleted += chunkResult.invoicesCompleted;
          aggregated.skipped += chunkResult.skipped;
          aggregated.failed += chunkResult.failed;
          aggregated.errors.push(...chunkResult.errors);
          aggregated.chunkResults.push({
            label: chunk.label,
            success: chunkResult.failed === 0 || chunkResult.invoicesCompleted > 0,
            result: chunkResult,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Fetch failed";
          aggregated.chunkResults.push({ label: chunk.label, success: false, error: message });
          aggregated.errors.push(`${chunk.label}: ${message}`);
        }
      }

      setBulkResult(aggregated);
    } finally {
      setFetching(false);
      setFetchProgress(null);
    }
  }

  async function handleFetchRspDateRange() {
    const validationError = validateDateRange();
    if (validationError) {
      setRspError(validationError);
      return;
    }

    setRspFetching(true);
    setRspError("");
    setRspResult(null);

    try {
      const chunks = getMonthChunksInDateRange(dateFrom, dateTo);
      let aggregated: RspFetchResult | null = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkResult = await fetchRspDateRangeChunk(
          chunk.dateFrom,
          chunk.dateToInclusive,
          (progress) => {
            setRspProgress({
              ...progress,
              label: `${chunk.label} — ${progress.label}`,
              chunkCurrent: chunks.length > 1 ? i + 1 : undefined,
              chunkTotal: chunks.length > 1 ? chunks.length : undefined,
            });
          }
        );

        if (!aggregated) {
          aggregated = { ...chunkResult };
        } else {
          aggregated.emailsFound += chunkResult.emailsFound;
          aggregated.pricesUpserted += chunkResult.pricesUpserted;
          aggregated.skipped += chunkResult.skipped;
          aggregated.failed += chunkResult.failed;
          aggregated.errors.push(...chunkResult.errors);
        }
      }

      if (aggregated) setRspResult(aggregated);
    } catch (err) {
      setRspError(err instanceof Error ? err.message : "RSP fetch failed");
    } finally {
      setRspFetching(false);
      setRspProgress(null);
    }
  }

  async function handleFetchDateRange() {
    const validationError = validateDateRange();
    if (validationError) {
      setFetchError(validationError);
      return;
    }

    const chunks = getMonthChunksInDateRange(dateFrom, dateTo);
    await runRangeFetch(dateFrom, dateTo, chunks);
  }

  async function handlePresetRange(range: { dateFrom: string; dateTo: string }) {
    applyPreset(range);
    const chunks = getMonthChunksInDateRange(range.dateFrom, range.dateTo);
    await runRangeFetch(range.dateFrom, range.dateTo, chunks);
  }

  const progressPercent = fetchProgress?.emailCurrent && fetchProgress.emailTotal
    ? Math.round((fetchProgress.emailCurrent / fetchProgress.emailTotal) * 100)
    : fetchProgress?.chunkCurrent && fetchProgress.chunkTotal
      ? Math.round((fetchProgress.chunkCurrent / fetchProgress.chunkTotal) * 100)
      : fetching
        ? 10
        : 0;

  const canFetch = status?.connected && status.claudeConfigured && !fetching;
  const canFetchRsp = status?.connected && !fetching && !rspFetching;
  const rspProgressPercent = rspProgress?.emailCurrent && rspProgress.emailTotal
    ? Math.round((rspProgress.emailCurrent / rspProgress.emailTotal) * 100)
    : rspProgress?.chunkCurrent && rspProgress.chunkTotal
      ? Math.round((rspProgress.chunkCurrent / rspProgress.chunkTotal) * 100)
      : rspFetching
        ? 10
        : 0;
  const isSingleChunk =
    !bulkResult && dateFrom && dateTo
      ? getMonthChunksInDateRange(dateFrom, dateTo).length === 1
      : true;

  return (
    <div className="space-y-4 sm:space-y-6">
      {!embedded && (
        <div>
          <PageTitle>Gmail Invoice Fetch</PageTitle>
          <p className="mt-2 text-sm text-ioc-muted">
            Fetch IOC invoice PDFs and retail selling price (RSP) emails from Gmail
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {status?.connected ? (
              <>
                <Badge variant="success">Connected</Badge>
                <span className="text-sm">{status.gmailEmail}</span>
              </>
            ) : (
              <Badge variant="warning">Not connected</Badge>
            )}
            {status?.claudeConfigured ? (
              <Badge variant="success">Claude ready</Badge>
            ) : (
              <Badge variant="warning">Claude not configured</Badge>
            )}
          </div>

          {!status?.oauthConfigured && (
            <p className="text-sm text-destructive">
              Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.
            </p>
          )}

          {status?.connected && !status.claudeConfigured && (
            <p className="text-sm text-destructive">
              Add ANTHROPIC_API_KEY to your environment variables to extract invoices with Claude.
            </p>
          )}

          {status?.config && (
            <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
              <p><strong>Sender:</strong> {status.config.sender}</p>
              <p><strong>Subject contains:</strong> {status.config.subject}</p>
              <p><strong>Attachment:</strong> PDF required</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!status?.connected ? (
              <Button onClick={handleConnect} disabled={!status?.oauthConfigured}>
                Connect Gmail
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleDisconnect}>
                  <Unplug className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Fetch Invoices</CardTitle>
            <CardDescription>
              Select any date range — days, months, or years. Invoices are fetched with Claude extraction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gmail-date-from">Date From</Label>
                <Input
                  id="gmail-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  disabled={fetching}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gmail-date-to">Date To</Label>
                <Input
                  id="gmail-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  disabled={fetching}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={fetching} onClick={() => applyPreset(getThisMonthRange())}>
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={fetching}
                onClick={() => applyPreset(getLastNMonthsRange(6))}
              >
                Last 6 Months
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={fetching}
                onClick={() => applyPreset(getLastNMonthsRange(12))}
              >
                Last 12 Months
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFetchDateRange} disabled={!canFetch}>
                {fetching && !fetchProgress ? "Searching Gmail..." : "Fetch Date Range (Claude)"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handlePresetRange(getLastNMonthsRange(6))}
                disabled={!canFetch}
              >
                <CalendarRange className="mr-2 h-4 w-4" />
                Fetch Last 6 Months Now
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Longer ranges are processed in monthly chunks to show progress. Each email is processed
              separately to avoid timeouts. Already-processed emails are skipped automatically.
            </p>

            {fetching && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {fetchProgress ? `${fetchProgress.label}...` : "Searching Gmail..."}
                </p>
                <Progress value={progressPercent} />
              </div>
            )}

            {fetchError && (
              <p className="text-sm text-destructive">{fetchError}</p>
            )}

            {result && !bulkResult && isSingleChunk && (
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <p className="font-medium">
                  {dateFrom} to {dateTo}
                </p>
                <p>{result.emailsFound} emails found</p>
                <p>{result.pdfsDownloaded} PDFs downloaded</p>
                <p>{result.invoicesCompleted} invoices completed</p>
                <p>{result.skipped} skipped (already processed)</p>
                <p className={result.failed > 0 ? "text-destructive" : ""}>
                  {result.failed} errors
                </p>
                <Progress value={100} />
                <p className="break-all text-xs text-muted-foreground">Query: {result.query}</p>
                {result.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-destructive">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                <Link href="/invoices">
                  <Button variant="outline" size="sm">View Invoices</Button>
                </Link>
              </div>
            )}

            {bulkResult && (
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <p className="font-medium">
                  {bulkResult.dateFrom} to {bulkResult.dateTo} — summary
                </p>
                <p>
                  {bulkResult.chunkResults.filter((entry) => entry.success).length} of{" "}
                  {bulkResult.chunkResults.length} periods completed with invoices
                </p>
                <p>{bulkResult.emailsFound} emails found</p>
                <p>{bulkResult.pdfsDownloaded} PDFs downloaded</p>
                <p>{bulkResult.invoicesCompleted} invoices completed</p>
                <p>{bulkResult.skipped} skipped (already processed)</p>
                <p className={bulkResult.failed > 0 ? "text-destructive" : ""}>
                  {bulkResult.failed} errors
                </p>
                <Progress value={100} />

                <div className="space-y-2 border-t pt-3">
                  <p className="font-medium">By period</p>
                  <ul className="space-y-1">
                    {bulkResult.chunkResults.map((entry) => (
                      <li key={entry.label} className="flex flex-wrap items-center gap-2">
                        <span>{entry.label}</span>
                        {entry.success ? (
                          <Badge variant="success">
                            {entry.result?.invoicesCompleted ?? 0} completed
                          </Badge>
                        ) : (
                          <Badge variant="warning">
                            {entry.result?.invoicesCompleted
                              ? `${entry.result.invoicesCompleted} completed`
                              : "Failed"}
                          </Badge>
                        )}
                        {entry.result && (
                          <span className="text-xs text-muted-foreground">
                            {entry.result.emailsFound} emails, {entry.result.skipped} skipped
                            {entry.result.failed > 0 ? `, ${entry.result.failed} errors` : ""}
                          </span>
                        )}
                        {!entry.success && entry.error && (
                          <span className="text-xs text-destructive">{entry.error}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {bulkResult.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-destructive">
                    {bulkResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}

                <Link href="/invoices">
                  <Button variant="outline" size="sm">View Invoices</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>Fetch Retail Selling Prices (RSP)</CardTitle>
            <CardDescription>
              Import IOCL price-change emails into retail selling prices for the Account dashboard.
              No Claude required — parses plain-text email body. Re-runs skip already imported
              emails without downloading them again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.rspConfig && (
              <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
                <p><strong>Sender:</strong> {status.rspConfig.sender}</p>
                <p><strong>Subject contains:</strong> {status.rspConfig.subject}</p>
                <p><strong>Customer code:</strong> {status.rspConfig.customerCode}</p>
                <p><strong>Products:</strong> Petrol → MS, Diesel → HSD (XP skipped)</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Uses the same date range as invoice fetch above ({dateFrom} to {dateTo}).
            </p>

            <Button onClick={handleFetchRspDateRange} disabled={!canFetchRsp}>
              {rspFetching ? "Fetching RSP emails..." : "Fetch RSP Price Changes"}
            </Button>

            {rspFetching && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {rspProgress ? `${rspProgress.label}...` : "Searching Gmail..."}
                </p>
                <Progress value={rspProgressPercent} />
              </div>
            )}

            {rspError && <p className="text-sm text-destructive">{rspError}</p>}

            {rspResult && (
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <p className="font-medium">
                  {dateFrom} to {dateTo} — RSP import
                </p>
                <p>{rspResult.emailsFound} emails found</p>
                <p>{rspResult.pricesUpserted} price rows upserted (MS + HSD)</p>
                <p>{rspResult.skipped} skipped (already processed)</p>
                <p className={rspResult.failed > 0 ? "text-destructive" : ""}>
                  {rspResult.failed} errors
                </p>
                <p className="break-all text-xs text-muted-foreground">Query: {rspResult.query}</p>
                {rspResult.errors.length > 0 && (
                  <ul className="list-disc pl-4 text-destructive">
                    {rspResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
                <Link href="/dashboard?tab=finance&finance=pad">
                  <Button variant="outline" size="sm">View Account Dashboard</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
