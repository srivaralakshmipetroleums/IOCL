import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { loadBankDashboardData } from "@/lib/bank/load-dashboard";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);
  const supabase = await createServiceClient();
  const data = await loadBankDashboardData(supabase, filters);

  return NextResponse.json({
    summary: data.summary,
    balanceTrend: data.balanceTrend,
    cashFlow: data.cashFlow,
    categories: data.categories,
    transferChannels: data.transferChannels,
    walletGrain: data.walletGrain,
    walletCredits: data.walletCredits,
    walletMissedDays: data.walletMissedDays,
  });
}
