export interface GmailInvoiceConfig {
  sender: string;
  subject: string;
  requireAttachment: boolean;
}

export function getGmailInvoiceConfig(): GmailInvoiceConfig {
  return {
    sender: process.env.GMAIL_INVOICE_SENDER || "B2BPRD@indianoil.in",
    subject: process.env.GMAIL_INVOICE_SUBJECT || "AC4 Inv.-",
    requireAttachment: process.env.GMAIL_INVOICE_REQUIRE_ATTACHMENT !== "false",
  };
}

export function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/gmail/callback`,
  };
}

export function isGoogleOAuthConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  return Boolean(clientId && clientSecret);
}
