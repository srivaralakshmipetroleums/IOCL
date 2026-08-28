import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getIrasDsrCaptureManager } from "@/lib/iras/dsr/capture-manager";
import { wireDsrCapturePersist } from "@/lib/iras/dsr/wire-persist";

export async function POST() {
  const { user, response, supabase } = await requireAuth();
  if (!user) return response!;

  try {
    wireDsrCapturePersist(supabase!);
    const status = await getIrasDsrCaptureManager().refresh();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unable to refresh IRAS DSR capture",
      },
      { status: 500 }
    );
  }
}
