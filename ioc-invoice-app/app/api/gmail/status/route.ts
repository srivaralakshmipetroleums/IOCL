import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { gmailConnectionRepository } from "@/lib/gmail/gmail-connection-repository";
import { getGmailInvoiceConfig, getGmailRspConfig, isGoogleOAuthConfigured } from "@/lib/gmail/gmail-config";
import { isClaudeConfigured } from "@/lib/extraction/get-extractor";

export async function GET() {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const connection = await gmailConnectionRepository.getByUserId(user.id);
  const config = getGmailInvoiceConfig();
  const rspConfig = getGmailRspConfig();

  return NextResponse.json({
    connected: Boolean(connection),
    gmailEmail: connection?.gmail_email ?? null,
    oauthConfigured: isGoogleOAuthConfigured(),
    claudeConfigured: isClaudeConfigured(),
    config: {
      sender: config.sender,
      subject: config.subject,
      requireAttachment: config.requireAttachment,
    },
    rspConfig: {
      sender: rspConfig.sender,
      subject: rspConfig.subject,
      customerCode: rspConfig.customerCode,
    },
  });
}
