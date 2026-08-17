import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { loadPadDashboardData } from "@/lib/pad/load-dashboard";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();
  const data = await loadPadDashboardData(supabase, filters);

  return NextResponse.json(data.charges);
}
