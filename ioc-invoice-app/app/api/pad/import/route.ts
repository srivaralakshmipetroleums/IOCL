import { readFileSync, readdirSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { importPadStatement } from "@/lib/pad/pad-repository";
import { parsePadStatementHtml } from "@/lib/pad/parse-pad-statement";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const padDir = path.resolve(process.cwd(), "..", "Docs", "PAD");
  const files = readdirSync(padDir)
    .filter((name) => /\.xls$/i.test(name))
    .sort();

  if (!files.length) {
    return NextResponse.json({ error: `No PAD files found in ${padDir}` }, { status: 404 });
  }

  const supabase = await createServiceClient();
  const results: Array<{ filename: string; transactionCount: number; fyLabel: string }> = [];

  for (const filename of files) {
    const html = readFileSync(path.join(padDir, filename), "utf8");
    const parsed = parsePadStatementHtml(html, filename);
    const result = await importPadStatement(supabase, parsed, filename);
    results.push({
      filename,
      transactionCount: result.transactionCount,
      fyLabel: parsed.fyLabel,
    });
  }

  return NextResponse.json({ ok: true, results });
}
