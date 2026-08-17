import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processGmailRspMessage } from "@/lib/gmail/gmail-rsp-service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { messageId } = body;

  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  try {
    const result = await processGmailRspMessage(user.id, messageId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail RSP processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
