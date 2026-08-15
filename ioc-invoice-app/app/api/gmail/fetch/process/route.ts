import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processGmailMessage } from "@/lib/gmail/gmail-service";
import { resolveExtractorMode } from "@/lib/extraction/get-extractor";
import {
  getInclusiveDateRangePeriod,
  getMonthDateRange,
} from "@/lib/invoices/period-utils";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { jobId, messageId, year, month, dateFrom, dateTo, extractorMode: requestedMode } = body;

  if (!jobId || !messageId) {
    return NextResponse.json({ error: "jobId and messageId are required" }, { status: 400 });
  }

  let period;
  if (dateFrom && dateTo) {
    period = getInclusiveDateRangePeriod(dateFrom, dateTo);
  } else if (year && month) {
    const monthPeriod = getMonthDateRange(year, month);
    const lastDay = new Date(year, month, 0).getDate();
    period = getInclusiveDateRangePeriod(
      monthPeriod.dateFrom,
      `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    );
  } else {
    return NextResponse.json(
      { error: "Provide dateFrom and dateTo, or year and month" },
      { status: 400 }
    );
  }

  const extractorMode = resolveExtractorMode(requestedMode);

  try {
    const result = await processGmailMessage(
      user.id,
      jobId,
      messageId,
      period,
      extractorMode
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail message processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
