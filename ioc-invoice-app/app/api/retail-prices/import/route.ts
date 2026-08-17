import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { parseRetailPriceCsv } from "@/lib/pad/retail-price-lookup";
import { upsertRetailPrices } from "@/lib/pad/retail-price-repository";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const contentType = request.headers.get("content-type") ?? "";
  let csv = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    csv = await file.text();
  } else {
    const body = await request.json();
    csv = String(body.csv ?? "");
  }

  const rows = parseRetailPriceCsv(csv);
  if (!rows.length) {
    return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const count = await upsertRetailPrices(supabase, rows);

  return NextResponse.json({ ok: true, imported: count });
}
