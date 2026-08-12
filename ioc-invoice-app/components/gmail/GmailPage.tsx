"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Mail, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MONTHS, getYearOptions } from "@/lib/invoices/period-utils";

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

export function GmailPage() {
  const searchParams = useSearchParams();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
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

    try {
      const res = await fetch("/api/gmail/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, extractorMode: "claude" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      setResult(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gmail Invoice Fetch</h1>
        <p className="text-muted-foreground">
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
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <>
                <Badge variant="success">Connected</Badge>
                <span className="text-sm">{status.gmailEmail}</span>
              </>
            ) : (
              <Badge variant="warning">Not connected</Badge>
            )}
          </div>

          {!status?.oauthConfigured && (
            <p className="text-sm text-destructive">
              Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to .env.local
            </p>
          )}

          {status?.config && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><strong>Sender:</strong> {status.config.sender}</p>
              <p><strong>Subject contains:</strong> {status.config.subject}</p>
              <p><strong>Attachment:</strong> PDF required</p>
            </div>
          )}

          <div className="flex gap-2">
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
            <CardDescription>Select year and month to search Gmail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
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
            </div>

            <Button onClick={handleFetch} disabled={fetching}>
              {fetching ? "Searching Gmail..." : "Fetch Invoices"}
            </Button>

            {fetching && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Searching Gmail...</p>
                <Progress value={50} />
              </div>
            )}

            {fetchError && (
              <p className="text-sm text-destructive">{fetchError}</p>
            )}

            {result && (
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <p>{result.emailsFound} emails found</p>
                <p>{result.pdfsDownloaded} PDFs downloaded</p>
                <p>{result.invoicesCompleted} invoices completed</p>
                <p>{result.skipped} skipped (already processed)</p>
                <p className={result.failed > 0 ? "text-destructive" : ""}>
                  {result.failed} errors
                </p>
                <Progress value={100} />
                <p className="text-xs text-muted-foreground break-all">Query: {result.query}</p>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
