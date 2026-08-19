import { NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron";
import { runWeeklyGmailSync } from "@/lib/gmail/run-weekly-gmail-sync";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWeeklyGmailSync();
    return NextResponse.json({
      ok: true,
      userId: result.userId,
      dateFrom: result.dateFrom,
      dateToInclusive: result.dateToInclusive,
      invoices: {
        jobId: result.invoices.jobId,
        emailsFound: result.invoices.emailsFound,
        invoicesCompleted: result.invoices.invoicesCompleted,
        skipped: result.invoices.skipped,
        failed: result.invoices.failed,
      },
      rsp: {
        jobId: result.rsp.jobId,
        emailsFound: result.rsp.emailsFound,
        pricesUpserted: result.rsp.pricesUpserted,
        skipped: result.rsp.skipped,
        failed: result.rsp.failed,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Weekly Gmail sync failed";
    console.error("[cron/gmail-weekly]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
