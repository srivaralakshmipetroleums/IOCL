import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getIrasDsrCaptureManager } from "@/lib/iras/dsr/capture-manager";

export async function POST() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const status = await getIrasDsrCaptureManager().stop();
  return NextResponse.json(status);
}
