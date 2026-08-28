import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSingleJob, parseBatchCaptureRequest, parseCaptureJobRequest } from "@/lib/iras/dsr/batch-plan";
import { getIrasDsrCaptureManager } from "@/lib/iras/dsr/capture-manager";
import { wireDsrCapturePersist } from "@/lib/iras/dsr/wire-persist";

export const runtime = "nodejs";

export async function runIrasDsrCapture(options: {
  supabase: SupabaseClient;
  batch?: boolean;
  batchCapture?: unknown;
  retryFailed?: boolean;
  job?: { month: number; year: number; product: "MS" | "HSD" };
  openBrowser?: boolean;
}) {
  wireDsrCapturePersist(options.supabase);
  const manager = getIrasDsrCaptureManager();

  if (options.openBrowser) {
    return manager.openBrowser();
  }

  if (options.retryFailed) {
    return manager.startRetryFailedBatch();
  }

  if (options.job) {
    return manager.startSelectedJobCapture(buildSingleJob(options.job));
  }

  if (options.batchCapture != null) {
    const plan = parseBatchCaptureRequest(options.batchCapture);
    if (!plan) {
      return {
        ...manager.getStatus(),
        status: "error" as const,
        error: "Invalid batch capture options",
      };
    }
    return manager.startCustomBatch(plan);
  }

  if (options.batch) {
    return manager.startJanJul2026Batch();
  }

  return manager.start();
}

export async function handleIrasDsrCapturePost(request: NextRequest, supabase: SupabaseClient) {
  let batch = false;
  let retryFailed = false;
  let openBrowser = false;
  let batchCapture: unknown;
  let job: { month: number; year: number; product: "MS" | "HSD" } | undefined;
  let jobRequested = false;

  try {
    const body = (await request.json()) as {
      batch?: boolean;
      batchCapture?: unknown;
      retryFailed?: boolean;
      openBrowser?: boolean;
      job?: { month?: unknown; year?: unknown; product?: unknown };
    };
    batch = body.batch === true;
    batchCapture = body.batchCapture;
    retryFailed = body.retryFailed === true;
    openBrowser = body.openBrowser === true;
    jobRequested = body.job != null;
    job = parseCaptureJobRequest(body.job ?? {}) ?? undefined;
  } catch {
    batch = false;
    batchCapture = undefined;
    retryFailed = false;
    openBrowser = false;
    job = undefined;
    jobRequested = false;
  }

  if (batchCapture != null && !parseBatchCaptureRequest(batchCapture)) {
    return NextResponse.json(
      {
        status: "error",
        error: "Invalid batch capture options",
        browserOpen: getIrasDsrCaptureManager().getStatus().browserOpen,
      },
      { status: 400 }
    );
  }

  if (jobRequested && !job) {
    return NextResponse.json(
      {
        status: "error",
        error: "Invalid month, year, or product",
        browserOpen: getIrasDsrCaptureManager().getStatus().browserOpen,
      },
      { status: 400 }
    );
  }

  if (job && (batch || batchCapture != null || retryFailed)) {
    return NextResponse.json(
      {
        status: "error",
        error: "Use either batch capture or a single selected job, not both",
        browserOpen: getIrasDsrCaptureManager().getStatus().browserOpen,
      },
      { status: 400 }
    );
  }

  const status = await runIrasDsrCapture({
    supabase,
    batch,
    batchCapture,
    retryFailed,
    job,
    openBrowser,
  });
  return NextResponse.json(status);
}
