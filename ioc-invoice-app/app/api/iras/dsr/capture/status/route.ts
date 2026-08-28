import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getIrasDsrCaptureManager } from "@/lib/iras/dsr/capture-manager";

export async function GET() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  return NextResponse.json(getIrasDsrCaptureManager().getStatus());
}
