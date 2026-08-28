import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { handleIrasDsrCapturePost } from "@/lib/iras/dsr/capture-route-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response, supabase } = await requireAuth();
  if (!user) return response!;

  try {
    return await handleIrasDsrCapturePost(request, supabase!);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unable to start IRAS DSR capture",
      },
      { status: 500 }
    );
  }
}
