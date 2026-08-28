import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { binaryFileResponse } from "@/lib/http/binary-file-response";
import { loadOwnerPackDataset, type OwnerPackPeriod } from "@/lib/reports/load-owner-pack";
import { generateOwnerPackZip } from "@/lib/reports/owner-pack-zip";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 180;

function periodFromBody(body: Record<string, unknown>): OwnerPackPeriod | null {
  const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom : "";
  const dateTo = typeof body.dateTo === "string" ? body.dateTo : "";
  const label = typeof body.label === "string" ? body.label : "";
  if (!dateFrom || !dateTo || !label) return null;
  const months = Array.isArray(body.months)
    ? body.months.filter((value): value is string => typeof value === "string")
    : undefined;
  return { dateFrom, dateTo, label, months };
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json().catch(() => ({}));
  const period = periodFromBody(body);
  if (!period) {
    return NextResponse.json(
      { error: "dateFrom, dateTo and label are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServiceClient();
    const data = await loadOwnerPackDataset(supabase, period);
    const { buffer, filename } = await generateOwnerPackZip(data);
    return binaryFileResponse(buffer, filename, "application/zip");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Owner pack export failed";
    console.error("[reports/owner-pack]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
