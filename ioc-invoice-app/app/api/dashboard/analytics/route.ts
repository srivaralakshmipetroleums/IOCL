import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { computeDashboardAnalytics } from "@/lib/dashboard/analytics/compute-analytics";
import { getDashboardFilters } from "@/lib/dashboard/filters";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const params = request.nextUrl.searchParams;
  const filters = getDashboardFilters(params);
  const view = params.get("view") === "invoice" ? "invoice" : "overview";
  const periodLabel = params.get("periodLabel") || "Selected period";
  const dateFrom = params.get("dateFrom") || filters.dateFrom || "";
  const dateTo = params.get("dateTo") || filters.dateTo || "";

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const analytics = await computeDashboardAnalytics(supabase, filters, {
    periodLabel,
    dateFrom,
    dateTo,
    view,
  });

  return NextResponse.json(analytics);
}
