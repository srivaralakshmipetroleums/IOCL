import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processingService } from "@/lib/invoices/processing-service";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const totalFiles = body.totalFiles || 1;
  const period = body.period
    ? { dateFrom: body.period.dateFrom, dateTo: body.period.dateTo, label: body.period.label }
    : undefined;
  const jobId = await processingService.createJob(user.id, totalFiles, period);
  return NextResponse.json({ jobId });
}
