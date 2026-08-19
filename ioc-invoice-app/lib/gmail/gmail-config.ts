import type { NextRequest } from "next/server";
import { getGmailOAuthRedirectUri } from "@/lib/app-url";

export interface GmailInvoiceConfig {
  sender: string;
  /** Human-readable label for UI */
  subject: string;
  /** Gmail subject patterns (OR) — matches partial subject lines */
  subjects: string[];
  requireAttachment: boolean;
}

export interface GmailRspConfig {
  sender: string;
  subject: string;
  subjects: string[];
  requireAttachment: boolean;
  customerCode: string;
}

/** IOCL invoice subjects: newer "AC4 Inv.-…" and older "AC4 Invoice by IndianOil…" */
const DEFAULT_INVOICE_SUBJECTS = ["AC4 Inv.-", "AC4 Invoice"];

function parseSubjectPatterns(raw: string | undefined): string[] {
  const value = raw?.trim();
  if (!value) return DEFAULT_INVOICE_SUBJECTS;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getGmailInvoiceConfig(): GmailInvoiceConfig {
  const subjects = parseSubjectPatterns(process.env.GMAIL_INVOICE_SUBJECT);
  return {
    sender: process.env.GMAIL_INVOICE_SENDER || "B2BPRD@indianoil.in",
    subject: subjects.join(" | "),
    subjects,
    requireAttachment: process.env.GMAIL_INVOICE_REQUIRE_ATTACHMENT !== "false",
  };
}

export function getGmailRspConfig(): GmailRspConfig {
  const subject = process.env.GMAIL_RSP_SUBJECT || "Price change";
  return {
    sender: process.env.GMAIL_RSP_SENDER || "IDPCS@indianoil.in",
    subject,
    subjects: [subject],
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
