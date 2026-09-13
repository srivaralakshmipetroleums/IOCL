import { readFileSync, readdirSync } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { importPadStatement } from "@/lib/pad/pad-repository";
import { parsePadStatementHtml } from "@/lib/pad/parse-pad-statement";
import { parsePadUpload } from "@/lib/pad/parse-upload";
import { createServiceClient } from "@/lib/supabase/server";

type PadImportResult = { filename: string; transactionCount: number; fyLabel: string };

async function importPadFromDocsFolder(): Promise<PadImportResult[]> {
  const padDir = path.resolve(process.cwd(), "..", "Docs", "PAD");
  const files = readdirSync(padDir)
    .filter((name) => /\.xls$/i.test(name))
    .sort();

  if (!files.length) {
    throw new Error(`No PAD files found in ${padDir}`);
  }

  const supabase = await createServiceClient();
  const results: PadImportResult[] = [];

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

  return results;
}

async function importPadFromUpload(file: File): Promise<PadImportResult[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parsePadUpload(buffer, file.name);
  const supabase = await createServiceClient();
  const result = await importPadStatement(supabase, parsed, file.name);

  return [
    {
      filename: file.name,
      transactionCount: result.transactionCount,
      fyLabel: parsed.fyLabel,
    },
  ];
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }

      const results = await importPadFromUpload(file);
      return NextResponse.json({ ok: true, results });
    }

    const results = await importPadFromDocsFolder();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PAD import failed";
    const status = message.includes("No PAD files found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
