"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarRange, Mail, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageTitle } from "@/components/layout/PageTitle";
import { MONTHS, getLastNCalendarMonths, getYearOptions } from "@/lib/invoices/period-utils";

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
  monthsProcessed: number;
  emailsFound: number;
  pdfsDownloaded: number;
  invoicesCompleted: number;
  skipped: number;
  failed: number;
  errors: string[];
  monthResults: Array<{
    label: string;
    success: boolean;
    result?: FetchResult;
    error?: string;
  }>;
}

interface FetchProgress {
  current: number;
  total: number;
  label: string;
}

async function fetchMonth(year: number, month: number): Promise<FetchResult> {
  const res = await fetch("/api/gmail/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year, month, extractorMode: "claude" }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Fetch failed");
  return data;
}

export function GmailPage() {
  const searchParams = useSearchParams();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkFetchResult | null>(null);
  const [fetchError, setFetchError] = useState("");

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

  async function handleFetch() {
    setFetching(true);
    setFetchError("");
    setResult(null);
    setBulkResult(null);
    setFetchProgress(null);

    try {
      const data = await fetchMonth(year, month);
      setResult(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  async function handleFetchLast6Months() {
    const months = getLastNCalendarMonths(6);
    setFetching(true);
    setFetchError("");
    setResult(null);
    setBulkResult(null);

    const aggregated: BulkFetchResult = {
      monthsProcessed: 0,
      emailsFound: 0,
      pdfsDownloaded: 0,
      invoicesCompleted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      monthResults: [],
    };

    try {
      for (let i = 0; i < months.length; i++) {
        const { year: y, month: m, label } = months[i];
        setFetchProgress({ current: i + 1, total: months.length, label });

        try {
          const monthResult = await fetchMonth(y, m);
          aggregated.monthsProcessed++;
          aggregated.emailsFound += monthResult.emailsFound;
          aggregated.pdfsDownloaded += monthResult.pdfsDownloaded;
          aggregated.invoicesCompleted += monthResult.invoicesCompleted;
          aggregated.skipped += monthResult.skipped;
          aggregated.failed += monthResult.failed;
          aggregated.errors.push(...monthResult.errors);
          aggregated.monthResults.push({ label, success: true, result: monthResult });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Fetch failed";
          aggregated.monthResults.push({ label, success: false, error: message });
          aggregated.errors.push(`${label}: ${message}`);
        }
      }

      setBulkResult(aggregated);
    } finally {
      setFetching(false);
      setFetchProgress(null);
    }
  }

  const progressPercent = fetchProgress
    ? Math.round((fetchProgress.current / fetchProgress.total) * 100)
    : fetching
      ? 50
      : 0;

  const canFetch = status?.connected && status.claudeConfigured && !fetching;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <PageTitle>Gmail Invoice Fetch</PageTitle>
        <p className="mt-2 text-sm text-ioc-muted">
          Fetch IOC invoice PDFs from Gmail and run them through the extraction pipeline
        </p>
      </div>

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
              Fetch one month at a time, or run all of the last 6 months automatically with Claude extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={fetching}
                >
                  {getYearOptions().map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={fetching}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFetch} disabled={!canFetch}>
                {fetching && !fetchProgress ? "Searching Gmail..." : "Fetch Selected Month"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleFetchLast6Months}
                disabled={!canFetch}
              >
                <CalendarRange className="mr-2 h-4 w-4" />
                Fetch Last 6 Months (Claude)
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Bulk fetch processes each month one by one. Already-processed emails are skipped automatically.
              This may take several minutes depending on invoice volume.
            </p>

            {fetching && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {fetchProgress
                    ? `Processing ${fetchProgress.label} (${fetchProgress.current} of ${fetchProgress.total})...`
                    : "Searching Gmail..."}
                </p>
                <Progress value={progressPercent} />
              </div>
            )}

            {fetchError && (
              <p className="text-sm text-destructive">{fetchError}</p>
            )}

            {result && !bulkResult && (
              <div className="space-y-3 rounded-md border p-4 text-sm">
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
                <p className="font-medium">Last 6 months — summary</p>
                <p>{bulkResult.monthsProcessed} of 6 months processed successfully</p>
                <p>{bulkResult.emailsFound} emails found</p>
                <p>{bulkResult.pdfsDownloaded} PDFs downloaded</p>
                <p>{bulkResult.invoicesCompleted} invoices completed</p>
                <p>{bulkResult.skipped} skipped (already processed)</p>
                <p className={bulkResult.failed > 0 ? "text-destructive" : ""}>
                  {bulkResult.failed} errors
                </p>
                <Progress value={100} />

                <div className="space-y-2 border-t pt-3">
                  <p className="font-medium">By month</p>
                  <ul className="space-y-1">
                    {bulkResult.monthResults.map((entry) => (
                      <li key={entry.label} className="flex flex-wrap items-center gap-2">
                        <span>{entry.label}</span>
                        {entry.success ? (
                          <Badge variant="success">
                            {entry.result?.invoicesCompleted ?? 0} completed
                          </Badge>
                        ) : (
                          <Badge variant="warning">Failed</Badge>
                        )}
                        {entry.success && entry.result && (
                          <span className="text-xs text-muted-foreground">
                            {entry.result.emailsFound} emails, {entry.result.skipped} skipped
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
    </div>
  );
}
