import { NextRequest } from "next/server";
import { startGmailCronPhase } from "@/lib/cron/start-gmail-cron-phase";
import { runWeeklyGmailRspSync } from "@/lib/gmail/run-weekly-gmail-sync";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return startGmailCronPhase(request, "rsp", async () => {
    const result = await runWeeklyGmailRspSync();
    return {
      userId: result.userId,
      dateFrom: result.dateFrom,
      dateToInclusive: result.dateToInclusive,
      rsp: {
        jobId: result.rsp.jobId,
        emailsFound: result.rsp.emailsFound,
        pricesUpserted: result.rsp.pricesUpserted,
        skipped: result.rsp.skipped,
        failed: result.rsp.failed,
      },
    };
  });
}
