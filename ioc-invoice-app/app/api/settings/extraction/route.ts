import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getClaudeModel } from "@/lib/extraction/claude-config";
import { getExtractionConfig } from "@/lib/extraction/get-extractor";

export async function GET() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const config = getExtractionConfig();

  return NextResponse.json({
    claudeConfigured: config.claudeConfigured,
    defaultMode: config.defaultMode,
    providerLabel: config.providerLabel,
    claudeModel: getClaudeModel(),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  });
}
