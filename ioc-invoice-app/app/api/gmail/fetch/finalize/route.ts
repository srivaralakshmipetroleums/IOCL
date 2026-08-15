import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { finalizeGmailFetchJob } from "@/lib/gmail/gmail-service";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { jobId, emailsFound, pdfsDownloaded, invoicesCompleted, skipped, failed } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    await finalizeGmailFetchJob(jobId, {
      emailsFound: emailsFound ?? 0,
      pdfsDownloaded: pdfsDownloaded ?? 0,
      invoicesCompleted: invoicesCompleted ?? 0,
      skipped: skipped ?? 0,
      failed: failed ?? 0,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize Gmail job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
