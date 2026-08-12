import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const supabase = await createServiceClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_date")
    .eq("status", "APPROVED");

  const grouped: Record<string, number> = {};
  for (const inv of invoices || []) {
    if (!inv.invoice_date) continue;
    const month = inv.invoice_date.slice(0, 7);
    grouped[month] = (grouped[month] || 0) + 1;
  }

  return NextResponse.json(
    Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))
  );
}
