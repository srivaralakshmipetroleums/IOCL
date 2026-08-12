"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Upload, FileText, X, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { PageTitle } from "@/components/layout/PageTitle";
import { PeriodSelector } from "./PeriodSelector";
import type { DatePeriod } from "@/lib/invoices/period-utils";
import { getMonthDateRange } from "@/lib/invoices/period-utils";

const EXTRACTION_MODE_KEY = "ioc-extraction-mode";

interface UploadItem {
  file: File;
  itemId?: string;
  uploadPath?: string;
  status: "pending" | "uploading" | "uploaded" | "processing" | "completed" | "failed" | "duplicate";
  error?: string;
}

interface ExtractionConfig {
  claudeConfigured: boolean;
  defaultMode: "claude" | "local";
  providerLabel: string;
  serviceRoleConfigured: boolean;
}

export function UploadPage() {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [useAiExtraction, setUseAiExtraction] = useState(true);
  const [lastExtractorMode, setLastExtractorMode] = useState<string>("");
  const [period, setPeriod] = useState<DatePeriod>(() => {
    const now = new Date();
    return getMonthDateRange(now.getFullYear(), now.getMonth() + 1);
  });

  const { data: extractionConfig } = useQuery<ExtractionConfig>({
    queryKey: ["extraction-config"],
    queryFn: () => fetch("/api/settings/extraction").then((r) => r.json()),
  });

  useEffect(() => {
    const saved = localStorage.getItem(EXTRACTION_MODE_KEY);
    if (saved === "claude" || saved === "local") {
      setUseAiExtraction(saved === "claude");
    } else if (extractionConfig) {
      setUseAiExtraction(extractionConfig.claudeConfigured);
    }
  }, [extractionConfig]);

  const { data: jobStatus } = useQuery({
    queryKey: ["job-status", jobId],
    queryFn: () => fetch(`/api/upload/jobs/${jobId}`).then((r) => r.json()),
    enabled: !!jobId && processing,
    refetchInterval: processing ? 2000 : false,
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...dropped.map((file) => ({ file, status: "pending" as const }))]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...selected.map((file) => ({ file, status: "pending" as const }))]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  function handleExtractionToggle(checked: boolean) {
    setUseAiExtraction(checked);
    localStorage.setItem(EXTRACTION_MODE_KEY, checked ? "claude" : "local");
  }

  async function handleUpload() {
    if (!files.length) return;

    const extractorMode = useAiExtraction ? "claude" : "local";
    if (useAiExtraction && !extractionConfig?.claudeConfigured) {
      alert("Claude API key is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.");
      return;
    }

    setUploading(true);
    setLastExtractorMode(extractorMode);

    try {
      const createRes = await fetch("/api/upload/create-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalFiles: files.length, period }),
      });
      const { jobId: newJobId } = await createRes.json();
      setJobId(newJobId);

      const filesRes = await fetch("/api/upload/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: newJobId,
          filenames: files.map((f) => f.file.name),
        }),
      });
      const { items } = await filesRes.json();

      const supabase = createClient();
      const updatedFiles = [...files];

      for (let i = 0; i < items.length; i++) {
        updatedFiles[i] = { ...updatedFiles[i], itemId: items[i].itemId, uploadPath: items[i].uploadPath, status: "uploading" };
        setFiles([...updatedFiles]);

        const { error } = await supabase.storage
          .from("invoice-pdfs")
          .upload(items[i].uploadPath, files[i].file, { contentType: "application/pdf", upsert: true });

        if (error) {
          updatedFiles[i] = { ...updatedFiles[i], status: "failed", error: error.message };
        } else {
          updatedFiles[i] = { ...updatedFiles[i], status: "uploaded" };
          await fetch(`/api/upload/jobs/${newJobId}/items`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: items[i].itemId, status: "UPLOADED" }),
          }).catch(() => {});
        }
        setFiles([...updatedFiles]);
      }

      setProcessing(true);

      const startRes = await fetch("/api/upload/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJobId, extractorMode, period }),
      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || "Extraction failed");
      }

      const startData = await startRes.json();
      setLastExtractorMode(startData.extractorMode || extractorMode);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const progress = jobStatus?.job
    ? Math.round((jobStatus.job.processed_files / Math.max(jobStatus.job.total_files, 1)) * 100)
    : 0;

  const isComplete = jobStatus?.job?.status === "COMPLETED" || jobStatus?.job?.status === "FAILED";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <PageTitle>Upload IOC Invoice PDFs</PageTitle>
        <p className="mt-2 text-sm text-ioc-muted">Drag and drop or browse to upload invoice PDFs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Period</CardTitle>
          <CardDescription>
            Select the month, year, or date range these invoices belong to. Already-extracted PDFs skip the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PeriodSelector onChange={setPeriod} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Extraction
          </CardTitle>
          <CardDescription>
            Automatically extract invoice data from PDFs using Claude API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={useAiExtraction}
                onChange={(e) => handleExtractionToggle(e.target.checked)}
                disabled={!extractionConfig?.claudeConfigured}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium">Use Claude AI extraction</span>
            </label>
            {extractionConfig?.claudeConfigured ? (
              <Badge variant="success">Claude API connected</Badge>
            ) : (
              <Badge variant="warning">API key not detected — restart dev server after adding keys</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {useAiExtraction && extractionConfig?.claudeConfigured
              ? "PDFs will be sent to Claude for automatic field extraction."
              : "Sample fixture data will be used instead of real PDF extraction."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Area</CardTitle>
          <CardDescription>PDF files only. Multiple files supported.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-ioc-blue sm:p-12"
          >
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium">Drag and drop PDF files here</p>
            <p className="mb-4 text-sm text-muted-foreground">or</p>
            <label>
              <Button variant="outline" asChild>
                <span>Browse Files</span>
              </Button>
              <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleFileSelect} />
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-medium">File Queue ({files.length})</h3>
              {files.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.file.name}</span>
                    <StatusIcon status={item.status} />
                    {item.error && <span className="text-xs text-destructive">{item.error}</span>}
                  </div>
                  {!uploading && !processing && (
                    <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {!uploading && !processing && (
                <Button onClick={handleUpload} className="mt-4" disabled={!files.length}>
                  {useAiExtraction && extractionConfig?.claudeConfigured
                    ? `Upload & Extract with AI (${files.length} file${files.length !== 1 ? "s" : ""})`
                    : `Upload & Process (${files.length} file${files.length !== 1 ? "s" : ""})`}
                </Button>
              )}
            </div>
          )}

          {processing && jobStatus?.job && (
            <div className="mt-6 space-y-4">
              {lastExtractorMode && (
                <p className="text-sm text-muted-foreground">
                  Extractor: <strong>{lastExtractorMode === "claude" ? "Claude API" : "Local sample data"}</strong>
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span>
                  {jobStatus.job.processed_files} / {jobStatus.job.total_files} processed
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              {jobStatus.items?.map((item: { id: string; filename: string; status: string; error_message?: string }) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.filename}</span>
                  <span className={item.status === "FAILED" ? "text-destructive" : "text-muted-foreground"}>
                    {item.status}{item.error_message ? `: ${item.error_message}` : ""}
                  </span>
                </div>
              ))}
              {isComplete && (
                <div className="rounded-md bg-muted p-4 text-sm space-y-2">
                  <p>Successful: {jobStatus.job.successful_files}</p>
                  <p>Failed: {jobStatus.job.failed_files}</p>
                  <p>Skipped (duplicates): {jobStatus.job.skipped_files}</p>
                  <Link href="/invoices">
                    <Button variant="outline" size="sm" className="mt-2">View Invoices</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed" || status === "uploaded") return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (status === "failed") return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (status === "uploading" || status === "processing") return <span className="text-xs text-muted-foreground">Processing...</span>;
  return null;
}
