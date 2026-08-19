import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { binaryFileResponse, EXCEL_CONTENT_TYPE } from "@/lib/http/binary-file-response";
import { loadPadReportDataset, type PadReportPeriod } from "@/lib/reports/load-pad-report";
import { generatePadExcelReport } from "@/lib/reports/pad-excel-report";

export const maxDuration = 120;

function periodFromBody(body: Record<string, unknown>): PadReportPeriod | null {
  const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom : "";
  const dateTo = typeof body.dateTo === "string" ? body.dateTo : "";
  const label = typeof body.label === "string" ? body.label : "";
  if (!dateFrom || !dateTo || !label) return null;
  const months = Array.isArray(body.months)
    ? body.months.filter((value): value is string => typeof value === "string")
    : undefined;
  return { dateFrom, dateTo, label, months };
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json().catch(() => ({}));
  const period = periodFromBody(body);
  if (!period) {
    return NextResponse.json(
      { error: "dateFrom, dateTo and label are required" },
      { status: 400 }
    );
  }

  try {
    const data = await loadPadReportDataset(period);
    const { buffer, filename } = await generatePadExcelReport(data);
    return binaryFileResponse(buffer, filename, EXCEL_CONTENT_TYPE);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PAD Excel report failed";
    console.error("[reports/pad/excel]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
