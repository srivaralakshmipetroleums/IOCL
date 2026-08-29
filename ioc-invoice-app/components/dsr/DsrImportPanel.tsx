"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";

interface ImportResponse {
  ok: boolean;
  product: IrasDsrProduct;
  month: number;
  year: number;
  recordsInserted: number;
  recordCount: number;
  firstDate: string | null;
  lastDate: string | null;
  warnings?: string[];
  error?: string;
}

function ProductUploadCard({
  product,
  onMessage,
}: {
  product: IrasDsrProduct;
  onMessage: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const tankLabel = product === "MS" ? "Tank-1 (Petrol)" : "Tank-2 (Diesel)";

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("product", product);
      const res = await fetch("/api/iras/dsr/import", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as ImportResponse;
      if (!res.ok) {
        throw new Error(body.error || "Import failed");
      }
      return body;
    },
    onSuccess: (data) => {
      const monthLabel = `${String(data.month).padStart(2, "0")}/${data.year}`;
      const range =
        data.firstDate && data.lastDate ? ` (${data.firstDate} to ${data.lastDate})` : "";
      const warningText =
        data.warnings && data.warnings.length > 0 ? ` ${data.warnings.join(" ")}` : "";
      onMessage(
        `${product}: imported ${data.recordCount} day${data.recordCount === 1 ? "" : "s"} for ${monthLabel}${range}.${warningText}`
      );
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("dsr-") });
    },
    onError: (err: Error) => onMessage(`${product}: ${err.message}`),
  });

  return (
    <div className="rounded-lg border border-ioc-border bg-ioc-surface/40 p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-ioc-navy">{product}</p>
        <p className="text-xs text-ioc-muted">
          Monthly IRAS DSR Excel for {tankLabel}. Download from IRAS portal, then upload here.
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importMutation.mutate(file);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={importMutation.isPending}
      >
        <Upload className="h-4 w-4" />
        {importMutation.isPending ? "Uploading..." : `Upload ${product} Excel`}
      </Button>
    </div>
  );
}

export function DsrImportPanel() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="ioc-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-ioc-navy">Import monthly DSR Excel</h3>
        <p className="text-xs text-ioc-muted">
          Upload the IRAS DSR report Excel (e.g. IRAS_DSR Report…) — one file per product per month.
          MS and HSD are stored separately, same as IRAS capture.
        </p>
      </div>

      {message && (
        <p className="mb-4 rounded-lg border border-ioc-border bg-ioc-surface/50 px-3 py-2 text-sm text-ioc-navy">
          {message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ProductUploadCard product="MS" onMessage={setMessage} />
        <ProductUploadCard product="HSD" onMessage={setMessage} />
      </div>
    </div>
  );
}
