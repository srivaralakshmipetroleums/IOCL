"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";

interface UploadItem {
  file: File;
  itemId?: string;
  uploadPath?: string;
  status: "pending" | "uploading" | "uploaded" | "processing" | "completed" | "failed" | "duplicate";
  error?: string;
}

export function UploadPage() {
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);

    try {
      const createRes = await fetch("/api/upload/create-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalFiles: files.length }),
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

      await fetch("/api/upload/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJobId }),
      });

      setProcessing(true);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  const progress = jobStatus?.job
    ? Math.round((jobStatus.job.processed_files / Math.max(jobStatus.job.total_files, 1)) * 100)
    : 0;

  const isComplete = jobStatus?.job?.status === "COMPLETED" || jobStatus?.job?.status === "FAILED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Upload IOC Invoice PDFs</h1>
        <p className="text-muted-foreground">Drag and drop or browse to upload invoice PDFs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Area</CardTitle>
          <CardDescription>PDF files only. Multiple files supported.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary"
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
                  Upload & Process {files.length} file{files.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
          )}

          {processing && jobStatus?.job && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {jobStatus.job.processed_files} / {jobStatus.job.total_files} processed
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
              {isComplete && (
                <div className="rounded-md bg-muted p-4 text-sm">
                  <p>Successful: {jobStatus.job.successful_files}</p>
                  <p>Failed: {jobStatus.job.failed_files}</p>
                  <p>Skipped (duplicates): {jobStatus.job.skipped_files}</p>
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
