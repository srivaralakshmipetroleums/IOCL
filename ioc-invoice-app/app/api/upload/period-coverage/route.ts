import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { duplicateService } from "@/lib/invoices/duplicate-service";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const params = request.nextUrl.searchParams;
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  const existingCount = await duplicateService.countInPeriod(dateFrom, dateTo);

  return NextResponse.json({
    dateFrom,
    dateTo,
    existingCount,
    hasExistingData: existingCount > 0,
    message:
      existingCount > 0
        ? `${existingCount} invoice(s) already extracted for this period. Duplicates will be skipped without calling the API.`
        : "No invoices found for this period yet.",
  });
}
