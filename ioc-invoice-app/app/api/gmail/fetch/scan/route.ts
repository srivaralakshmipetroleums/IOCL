import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { scanGmailMonth, scanGmailRange } from "@/lib/gmail/gmail-service";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { year, month, dateFrom, dateTo } = body;

  try {
    if (dateFrom && dateTo) {
      const result = await scanGmailRange(user.id, dateFrom, dateTo);
      return NextResponse.json(result);
    }

    if (year && month) {
      const result = await scanGmailMonth(user.id, year, month);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Provide dateFrom and dateTo, or year and month" },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
