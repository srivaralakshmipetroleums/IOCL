import { google, gmail_v1 } from "googleapis";
import type { NextRequest } from "next/server";
import { getGoogleOAuthConfig, getGmailInvoiceConfig } from "./gmail-config";
import { buildGmailSearchQuery } from "./gmail-search";
import { gmailConnectionRepository } from "./gmail-connection-repository";
import { processingService } from "@/lib/invoices/processing-service";
import { createServiceClient } from "@/lib/supabase/server";
import { getMonthDateRange } from "@/lib/invoices/period-utils";
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

export async function fetchGmailInvoices(
  userId: string,
  year: number,
  month: number,
  extractorMode: ExtractorMode = "auto"
): Promise<GmailFetchResult> {
  const config = getGmailInvoiceConfig();
  const query = buildGmailSearchQuery(year, month, config);
  const period = getMonthDateRange(year, month);
  const gmail = await getAuthenticatedGmailClient(userId);

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100,
  });

  const messageIds = listRes.data.messages?.map((m) => m.id!).filter(Boolean) || [];
  const errors: string[] = [];
  let pdfsDownloaded = 0;
  let invoicesCompleted = 0;
  let skipped = 0;
  let failed = 0;

  const jobId = await processingService.createJob(userId, messageIds.length, period, "GMAIL_FETCH");

  for (const messageId of messageIds) {
    if (await isMessageAlreadyProcessed(messageId)) {
      skipped++;
      continue;
    }

    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const pdfs = getPdfAttachments(msgRes.data);
      if (!pdfs.length) {
        skipped++;
        continue;
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

          // Tag invoice with Gmail source
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
  }

  const supabase = await createServiceClient();
  await supabase
    .from("processing_jobs")
    .update({
      status: failed > 0 && invoicesCompleted === 0 ? "FAILED" : "COMPLETED",
      total_files: messageIds.length,
      processed_files: messageIds.length,
      successful_files: invoicesCompleted,
      failed_files: failed,
      skipped_files: skipped,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return {
    jobId,
    query,
    emailsFound: messageIds.length,
    pdfsDownloaded,
    invoicesCompleted,
    skipped,
    failed,
    errors,
  };
}
