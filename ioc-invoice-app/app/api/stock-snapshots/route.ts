import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { getStockSnapshots, upsertStockSnapshot } from "@/lib/stock/repository";
import { createServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  scope: z.enum(["month", "financial_year"]),
  period_key: z.string().min(1),
  product: z.enum(["MS", "HSD"]),
  snapshot_kind: z.enum(["opening", "closing"]),
  quantity_litres: z.number().nonnegative(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const supabase = await createServiceClient();
  const rows = await getStockSnapshots(supabase);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = bodySchema.parse(await request.json());
  const supabase = await createServiceClient();
  await upsertStockSnapshot(supabase, body);

  return NextResponse.json({ ok: true });
}
