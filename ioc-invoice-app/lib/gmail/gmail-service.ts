import { google, gmail_v1 } from "googleapis";
import type { NextRequest } from "next/server";
import { getGoogleOAuthConfig, getGmailInvoiceConfig } from "./gmail-config";
import { buildGmailSearchQueryForRange } from "./gmail-search";
import { gmailConnectionRepository } from "./gmail-connection-repository";
import { processingService } from "@/lib/invoices/processing-service";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getInclusiveDateRangePeriod,
  getMonthDateRange,
  type DatePeriod,
} from "@/lib/invoices/period-utils";
import type { ExtractorMode } from "@/lib/extraction/get-extractor";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

export function createOAuth2Client(request?: NextRequest) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(request);
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl(state: string, request?: NextRequest): string {
  const oauth2Client = createOAuth2Client(request);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string, request?: NextRequest) {
  const oauth2Client = createOAuth2Client(request);
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token ?? null,
    token_expiry: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
    gmail_email: profile.data.emailAddress ?? null,
  };
}

async function getAuthenticatedGmailClient(userId: string) {
  const connection = await gmailConnectionRepository.getByUserId(userId);
  if (!connection) throw new Error("Gmail not connected");

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token ?? undefined,
    expiry_date: connection.token_expiry
      ? new Date(connection.token_expiry).getTime()
      : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await gmailConnectionRepository.upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? connection.refresh_token,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : connection.token_expiry,
        gmail_email: connection.gmail_email,
      });
    }
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

async function isMessageAlreadyProcessed(messageId: string): Promise<boolean> {
  const supabase = await createServiceClient();
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("source_message_id", messageId);

  return (count || 0) > 0;
}

function getPdfAttachments(message: gmail_v1.Schema$Message) {
  const parts = message.payload?.parts || [];
  const pdfs: Array<{ filename: string; attachmentId: string; mimeType: string }> = [];

  function walk(partsList: gmail_v1.Schema$MessagePart[]) {
    for (const part of partsList) {
      if (part.filename && part.body?.attachmentId) {
        const mime = part.mimeType || "";
        if (mime === "application/pdf" || part.filename.toLowerCase().endsWith(".pdf")) {
          pdfs.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId,
            mimeType: mime,
          });
        }
      }
      if (part.parts) walk(part.parts);
    }
  }

  walk(parts);
  return pdfs;
}

export interface GmailFetchResult {
  jobId: string;
  query: string;
  emailsFound: number;
  pdfsDownloaded: number;
  invoicesCompleted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface GmailScanResult {
  jobId: string;
  query: string;
  emailsFound: number;
  skippedAlready: number;
  pendingMessageIds: string[];
}

export interface GmailMessageProcessResult {
  pdfsDownloaded: number;
  invoicesCompleted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function listGmailMessageIds(
  gmail: gmail_v1.Gmail,
  query: string
): Promise<string[]> {
  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 100,
      pageToken,
    });

    messageIds.push(...(listRes.data.messages?.map((m) => m.id!).filter(Boolean) || []));
    pageToken = listRes.data.nextPageToken ?? undefined;
  } while (pageToken);

  return messageIds;
}

export async function scanGmailRange(
  userId: string,
  dateFrom: string,
  dateToInclusive: string
): Promise<GmailScanResult> {
  const config = getGmailInvoiceConfig();
  const query = buildGmailSearchQueryForRange(dateFrom, dateToInclusive, config);
  const period = getInclusiveDateRangePeriod(dateFrom, dateToInclusive);
  const gmail = await getAuthenticatedGmailClient(userId);
  const messageIds = await listGmailMessageIds(gmail, query);

  let skippedAlready = 0;
  const pendingMessageIds: string[] = [];

  for (const messageId of messageIds) {
    if (await isMessageAlreadyProcessed(messageId)) {
      skippedAlready++;
    } else {
      pendingMessageIds.push(messageId);
    }
  }

  const jobId = await processingService.createJob(userId, messageIds.length, period, "GMAIL_FETCH");
  const supabase = await createServiceClient();
  await supabase
    .from("processing_jobs")
    .update({
      status: "PROCESSING",
      started_at: new Date().toISOString(),
      skipped_files: skippedAlready,
    })
    .eq("id", jobId);

  return {
    jobId,
    query,
    emailsFound: messageIds.length,
    skippedAlready,
    pendingMessageIds,
  };
}

export async function scanGmailMonth(
  userId: string,
  year: number,
  month: number
): Promise<GmailScanResult> {
  const period = getMonthDateRange(year, month);
  const lastDay = new Date(year, month, 0).getDate();
  const dateToInclusive = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return scanGmailRange(userId, period.dateFrom, dateToInclusive);
}

export async function processGmailMessage(
  userId: string,
  jobId: string,
  messageId: string,
  period: DatePeriod,
  extractorMode: ExtractorMode = "auto"
): Promise<GmailMessageProcessResult> {
  const gmail = await getAuthenticatedGmailClient(userId);
  const errors: string[] = [];
  let pdfsDownloaded = 0;
  let invoicesCompleted = 0;
  let skipped = 0;
  let failed = 0;

  if (await isMessageAlreadyProcessed(messageId)) {
    return { pdfsDownloaded, invoicesCompleted, skipped: 1, failed, errors };
  }

  try {
    const msgRes = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const pdfs = getPdfAttachments(msgRes.data);
    if (!pdfs.length) {
      return { pdfsDownloaded, invoicesCompleted, skipped: 1, failed, errors };
    }

    for (const pdf of pdfs) {
      const attachmentRes = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: pdf.attachmentId,
      });

      const data = attachmentRes.data.data;
      if (!data) {
        failed++;
        errors.push(`No data for attachment ${pdf.filename} in message ${messageId}`);
        continue;
      }

      const buffer = Buffer.from(data, "base64url");
      pdfsDownloaded++;

      const itemId = await processingService.addJobItem(jobId, pdf.filename);
      const invoiceId = crypto.randomUUID();
      const now = new Date();
      const storagePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${invoiceId}.pdf`;

      const supabase = await createServiceClient();
      const { error: uploadError } = await supabase.storage
        .from("invoice-pdfs")
        .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

      if (uploadError) {
        failed++;
        errors.push(uploadError.message);
        continue;
      }

      await processingService.updateJobItem(itemId, {
        storage_path: storagePath,
        status: "UPLOADED",
      });

      try {
        const result = await processingService.processItem(itemId, storagePath, {
          extractorMode,
          period,
        });

        if (result.invoiceId) {
          await supabase
            .from("invoices")
            .update({
              source_type: "GMAIL",
              source_message_id: messageId,
            })
            .eq("id", result.invoiceId);
        }

        if (result.status === "COMPLETED") invoicesCompleted++;
        else if (result.status === "SKIPPED" || result.status === "DUPLICATE") skipped++;
      } catch (err) {
        failed++;
        errors.push(err instanceof Error ? err.message : "Processing failed");
      }
    }
  } catch (err) {
    failed++;
    errors.push(err instanceof Error ? err.message : `Failed message ${messageId}`);
  }

  return { pdfsDownloaded, invoicesCompleted, skipped, failed, errors };
}

export async function finalizeGmailFetchJob(
  jobId: string,
  result: Pick<
    GmailFetchResult,
    "emailsFound" | "pdfsDownloaded" | "invoicesCompleted" | "skipped" | "failed"
  >
): Promise<void> {
  const supabase = await createServiceClient();
  await supabase
    .from("processing_jobs")
    .update({
      status: result.failed > 0 && result.invoicesCompleted === 0 ? "FAILED" : "COMPLETED",
      total_files: result.emailsFound,
      processed_files: result.emailsFound,
      successful_files: result.invoicesCompleted,
      failed_files: result.failed,
      skipped_files: result.skipped,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

export async function fetchGmailInvoices(
  userId: string,
  year: number,
  month: number,
  extractorMode: ExtractorMode = "auto"
): Promise<GmailFetchResult> {
  const period = getMonthDateRange(year, month);
  const lastDay = new Date(year, month, 0).getDate();
  const dateToInclusive = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return fetchGmailDateRange(userId, period.dateFrom, dateToInclusive, extractorMode);
}

export async function fetchGmailDateRange(
  userId: string,
  dateFrom: string,
  dateToInclusive: string,
  extractorMode: ExtractorMode = "auto"
): Promise<GmailFetchResult> {
  const scan = await scanGmailRange(userId, dateFrom, dateToInclusive);
  const period = getInclusiveDateRangePeriod(dateFrom, dateToInclusive);
  const errors: string[] = [];
  let pdfsDownloaded = 0;
  let invoicesCompleted = 0;
  let skipped = scan.skippedAlready;
  let failed = 0;

  for (const messageId of scan.pendingMessageIds) {
    const partial = await processGmailMessage(
      userId,
      scan.jobId,
      messageId,
      period,
      extractorMode
    );
    pdfsDownloaded += partial.pdfsDownloaded;
    invoicesCompleted += partial.invoicesCompleted;
    skipped += partial.skipped;
    failed += partial.failed;
    errors.push(...partial.errors);
  }

  const result: GmailFetchResult = {
    jobId: scan.jobId,
    query: scan.query,
    emailsFound: scan.emailsFound,
    pdfsDownloaded,
    invoicesCompleted,
    skipped,
    failed,
    errors,
  };

  await finalizeGmailFetchJob(scan.jobId, result);
  return result;
}
