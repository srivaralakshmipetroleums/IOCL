import type { NextRequest } from "next/server";
import { getGmailOAuthRedirectUri } from "@/lib/app-url";

export interface GmailInvoiceConfig {
  sender: string;
  subject: string;
  requireAttachment: boolean;
}

export interface GmailRspConfig {
  sender: string;
  subject: string;
  requireAttachment: boolean;
  customerCode: string;
}

export function getGmailInvoiceConfig(): GmailInvoiceConfig {
  return {
    sender: process.env.GMAIL_INVOICE_SENDER || "B2BPRD@indianoil.in",
    subject: process.env.GMAIL_INVOICE_SUBJECT || "AC4 Inv.-",
    requireAttachment: process.env.GMAIL_INVOICE_REQUIRE_ATTACHMENT !== "false",
  };
}

export function getGmailRspConfig(): GmailRspConfig {
  return {
    sender: process.env.GMAIL_RSP_SENDER || "IDPCS@indianoil.in",
    subject: process.env.GMAIL_RSP_SUBJECT || "Price change",
    requireAttachment: false,
    customerCode: process.env.GMAIL_RSP_CUSTOMER_CODE || "330042",
  };
}

export function getGoogleOAuthConfig(request?: NextRequest) {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: getGmailOAuthRedirectUri(request),
  };
}

export function isGoogleOAuthConfigured(): boolean {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  return Boolean(clientId && clientSecret);
}
