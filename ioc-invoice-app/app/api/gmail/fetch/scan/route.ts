import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { scanGmailMonth } from "@/lib/gmail/gmail-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { year, month } = body;

  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  try {
    const result = await scanGmailMonth(user.id, year, month);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
