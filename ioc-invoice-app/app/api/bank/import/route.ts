import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { importAllBankStatements } from "@/lib/bank/import-all";
import { importBankUpload } from "@/lib/bank/import-upload";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    const supabase = await createServiceClient();

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const results = await importBankUpload(supabase, buffer, file.name);
      return NextResponse.json({ ok: true, results });
    }

    const results = await importAllBankStatements(supabase);
    if (!results.length) {
      return NextResponse.json({ error: "No bank statement files found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bank import failed";
    const status =
      message.includes("No bank statement files found") || message.includes("No monthly statements")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
