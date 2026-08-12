import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const params = request.nextUrl.searchParams;
  const supabase = await createServiceClient();

  let query = supabase
    .from("invoices")
    .select("invoice_date, invoice_total")
    .eq("status", "APPROVED");

  if (params.get("dateFrom")) query = query.gte("invoice_date", params.get("dateFrom")!);
  if (params.get("dateTo")) query = query.lte("invoice_date", params.get("dateTo")!);

  const { data } = await query.order("invoice_date");

  const grouped: Record<string, number> = {};
  for (const row of data || []) {
    const date = row.invoice_date || "unknown";
    grouped[date] = (grouped[date] || 0) + (row.invoice_total || 0);
  }

  return NextResponse.json(
    Object.entries(grouped).map(([date, value]) => ({ date, value }))
  );
}
