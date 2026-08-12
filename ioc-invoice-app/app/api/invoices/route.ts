import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { invoiceRepository } from "@/lib/invoices/invoice-repository";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const params = request.nextUrl.searchParams;
  const result = await invoiceRepository.list({
    status: params.get("status") || undefined,
    supplier: params.get("supplier") || undefined,
    product: params.get("product") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    search: params.get("search") || undefined,
    page: parseInt(params.get("page") || "1"),
    pageSize: parseInt(params.get("pageSize") || "20"),
  });

  return NextResponse.json(result);
}
