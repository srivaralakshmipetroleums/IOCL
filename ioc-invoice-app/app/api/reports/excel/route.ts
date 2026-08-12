import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { excelReportService } from "@/lib/excel/excel-report-service";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json().catch(() => ({}));

  const buffer = await excelReportService.generateInvoiceReport({
    dateFrom: body.dateFrom,
    dateTo: body.dateTo,
    supplier: body.supplier,
    product: body.product,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="invoice-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
