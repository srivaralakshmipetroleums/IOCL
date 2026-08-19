import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { excelReportService } from "@/lib/excel/excel-report-service";
import { binaryFileResponse, EXCEL_CONTENT_TYPE } from "@/lib/http/binary-file-response";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json().catch(() => ({}));

  try {
    const { buffer, filename } = await excelReportService.generateInvoiceReport({
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      supplier: body.supplier,
      product: body.product,
    });

    return binaryFileResponse(buffer, filename, EXCEL_CONTENT_TYPE);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invoice Excel report failed";
    console.error("[reports/excel]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
