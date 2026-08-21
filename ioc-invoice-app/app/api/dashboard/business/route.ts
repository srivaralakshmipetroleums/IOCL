import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { loadBusinessDashboard } from "@/lib/stock/load-business-dashboard";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  if (!filters.dateFrom || !filters.dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const payload = await loadBusinessDashboard(supabase, filters);
  return NextResponse.json(payload);
}
