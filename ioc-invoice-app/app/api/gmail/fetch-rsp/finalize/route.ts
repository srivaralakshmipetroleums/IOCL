import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { finalizeGmailRspFetchJob } from "@/lib/gmail/gmail-rsp-service";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { jobId, emailsFound, pricesUpserted, skipped, failed } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    await finalizeGmailRspFetchJob(jobId, {
      emailsFound: emailsFound ?? 0,
      pricesUpserted: pricesUpserted ?? 0,
      skipped: skipped ?? 0,
      failed: failed ?? 0,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Finalize failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
