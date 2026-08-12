import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { fetchGmailInvoices } from "@/lib/gmail/gmail-service";
import { resolveExtractorMode } from "@/lib/extraction/get-extractor";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { year, month, extractorMode: requestedMode } = body;

  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const extractorMode = resolveExtractorMode(requestedMode);

  try {
    const result = await fetchGmailInvoices(user.id, year, month, extractorMode);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
