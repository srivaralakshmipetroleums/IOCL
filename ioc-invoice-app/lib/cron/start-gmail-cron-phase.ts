import { after } from "next/server";
import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron";

export function startGmailCronPhase(
  request: NextRequest,
  phase: "invoices" | "rsp" | "all",
  run: () => Promise<unknown>
) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await run();
      console.info(`[cron/gmail-weekly-${phase}]`, JSON.stringify(result));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Weekly Gmail sync failed";
      console.error(`[cron/gmail-weekly-${phase}]`, message);
    }
  });

  return NextResponse.json(
    { ok: true, phase, status: "started" },
    { status: 202 }
  );
}
