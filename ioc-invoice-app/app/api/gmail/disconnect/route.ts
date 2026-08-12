import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { gmailConnectionRepository } from "@/lib/gmail/gmail-connection-repository";

export async function DELETE() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  await gmailConnectionRepository.deleteByUserId(user.id);
  return NextResponse.json({ success: true });
}
