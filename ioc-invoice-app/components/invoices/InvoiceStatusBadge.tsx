import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/types/database";

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "processing" | "duplicate" | "outline" }
> = {
  UPLOADED: { label: "Uploaded", variant: "secondary" },
  PROCESSING: { label: "Processing", variant: "processing" },
  EXTRACTED: { label: "Extracted", variant: "default" },
  NEEDS_REVIEW: { label: "Needs Review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
  DUPLICATE: { label: "Duplicate", variant: "duplicate" },
  SKIPPED: { label: "Skipped", variant: "secondary" },
  REPLACED: { label: "Replaced", variant: "secondary" },
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as InvoiceStatus] || {
    label: status,
    variant: "outline" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
