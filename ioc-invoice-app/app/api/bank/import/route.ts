import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { importAllBankStatements } from "@/lib/bank/import-all";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const supabase = await createServiceClient();
  const results = await importAllBankStatements(supabase);
  if (!results.length) {
    return NextResponse.json({ error: "No bank statement files found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, results });
}
