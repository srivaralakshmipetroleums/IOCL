import { NextRequest } from "next/server";
import { startGmailCronPhase } from "@/lib/cron/start-gmail-cron-phase";
import { runWeeklyGmailInvoiceSync } from "@/lib/gmail/run-weekly-gmail-sync";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return startGmailCronPhase(request, "invoices", async () => {
    const result = await runWeeklyGmailInvoiceSync();
    return {
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
    };
  });
}
