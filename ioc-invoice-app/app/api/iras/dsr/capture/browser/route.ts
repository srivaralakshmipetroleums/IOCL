import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { runIrasDsrCapture } from "@/lib/iras/dsr/capture-route-handler";

export const runtime = "nodejs";

export async function POST() {
  const { user, response, supabase } = await requireAuth();
  if (!user) return response!;

  try {
    const status = await runIrasDsrCapture({ supabase: supabase!, openBrowser: true });
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unable to open IRAS browser",
      },
      { status: 500 }
    );
  }
}
