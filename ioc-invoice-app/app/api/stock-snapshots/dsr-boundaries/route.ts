import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { buildDsrLedgerRows } from "@/lib/iras/dsr/metrics";
import { getDsrRecordsInPeriod } from "@/lib/iras/dsr/query-helpers";
import { boundaryDatesForScope } from "@/lib/stock/build-snapshots";
import { deriveDsrStockBoundaries } from "@/lib/stock/dsr-stock-boundaries";
import { createServiceClient } from "@/lib/supabase/server";
import type { StockScope } from "@/lib/stock/types";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const scope = request.nextUrl.searchParams.get("scope");
  const periodKey = request.nextUrl.searchParams.get("periodKey");

  if (scope !== "month" && scope !== "financial_year") {
    return NextResponse.json({ error: "scope must be month or financial_year" }, { status: 400 });
  }
  if (!periodKey) {
    return NextResponse.json({ error: "periodKey is required" }, { status: 400 });
  }

  const { openingDate, closingDate } = boundaryDatesForScope(scope as StockScope, periodKey);
  const supabase = await createServiceClient();
  const entries = await getDsrRecordsInPeriod(supabase, {
    dateFrom: openingDate,
    dateTo: closingDate,
  });
  const boundaries = deriveDsrStockBoundaries(
    buildDsrLedgerRows(entries),
    openingDate,
    closingDate
  );

  return NextResponse.json({
    ok: true,
    dateFrom: openingDate,
    dateTo: closingDate,
    boundaries,
  });
}
