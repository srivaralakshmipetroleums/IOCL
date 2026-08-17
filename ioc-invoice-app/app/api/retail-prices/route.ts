import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { getRetailPrices } from "@/lib/pad/query-helpers";
import { upsertRetailPrices } from "@/lib/pad/retail-price-repository";
import { createServiceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  product: z.enum(["MS", "HSD"]),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price_per_litre: z.number().positive(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const supabase = await createServiceClient();
  const prices = await getRetailPrices(supabase);
  return NextResponse.json(prices);
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = bodySchema.parse(await request.json());
  const supabase = await createServiceClient();
  await upsertRetailPrices(supabase, [body]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { error } = await supabase.from("retail_selling_prices").delete().eq("id", id);
  if (error) throw error;

  return NextResponse.json({ ok: true });
}
