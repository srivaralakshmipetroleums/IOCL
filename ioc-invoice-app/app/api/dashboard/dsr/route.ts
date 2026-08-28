import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDashboardFilters } from "@/lib/dashboard/filters";
import { loadDsrDashboardData } from "@/lib/iras/dsr/load-dashboard";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const filters = getDashboardFilters(request.nextUrl.searchParams);

  if (!filters.dateFrom || !filters.dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  try {
    const supabase = await createServiceClient();
    const data = await loadDsrDashboardData(supabase, filters);

    return NextResponse.json({
      summary: data.summary,
      productSalesSummary: data.productSalesSummary,
      volumeByMonth: data.volumeByMonth,
      totalizerByMonth: data.totalizerByMonth,
      grossProfitByMonth: data.grossProfitByMonth,
      dailyVolume: data.dailyVolume,
      stockTrend: data.stockTrend,
      missingDates: data.missingDates,
      receiptReconciliation: data.receiptReconciliation,
      records: data.ledgerRows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load DSR dashboard" },
      { status: 500 }
    );
  }
}
