import { google, gmail_v1 } from "googleapis";
import { getGmailRspConfig } from "@/lib/gmail/gmail-config";
import { buildGmailSearchQueryForRange } from "@/lib/gmail/gmail-search";
import { gmailConnectionRepository } from "@/lib/gmail/gmail-connection-repository";
import { createOAuth2Client } from "@/lib/gmail/gmail-service";
import { parseRspEmail } from "@/lib/pad/parse-rsp-email";
import { upsertRetailPrices } from "@/lib/pad/retail-price-repository";
import type { RetailPriceRow } from "@/lib/pad/types";
import { processingService } from "@/lib/invoices/processing-service";
import {
  getInclusiveDateRangePeriod,
  getMonthDateRange,
} from "@/lib/invoices/period-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { partitionRspMessageIds } from "@/lib/gmail/gmail-rsp-skip";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

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

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function extractPlainTextBody(message: gmail_v1.Schema$Message): string {
  const plainChunks: string[] = [];
  const htmlChunks: string[] = [];

  function walk(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) return;
    const mime = part.mimeType || "";

    if (part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (mime === "text/plain") plainChunks.push(decoded);
      else if (mime === "text/html") htmlChunks.push(decoded);
    }

    if (part.parts) {
      for (const child of part.parts) walk(child);
    }
  }

  walk(message.payload);

  if (plainChunks.length) {
    return plainChunks.join("\n").trim();
  }

  if (htmlChunks.length) {
    return htmlChunks
      .join("\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (message.payload?.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }

  return "";
}

function getMessageSubject(message: gmail_v1.Schema$Message): string {
  const header = message.payload?.headers?.find(
    (h) => h.name?.toLowerCase() === "subject"
  );
  return header?.value ?? "";
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

const PROCESSED_ID_CHUNK = 100;

async function loadProcessedRspMessageIds(messageIds: string[]): Promise<Set<string>> {
  const processed = new Set<string>();
  if (!messageIds.length) return processed;

  const supabase = await createServiceClient();

  for (let i = 0; i < messageIds.length; i += PROCESSED_ID_CHUNK) {
    const chunk = messageIds.slice(i, i + PROCESSED_ID_CHUNK);

    const { data: logged } = await supabase
      .from("retail_price_gmail_messages")
      .select("message_id")
      .in("message_id", chunk);

    for (const row of logged ?? []) {
      if (row.message_id) processed.add(row.message_id);
    }

    const { data: priced } = await supabase
      .from("retail_selling_prices")
      .select("source_message_id")
      .in("source_message_id", chunk);

    for (const row of priced ?? []) {
      if (row.source_message_id) processed.add(row.source_message_id);
    }
  }

  return processed;
}

async function isRspMessageAlreadyProcessed(messageId: string): Promise<boolean> {
  const processed = await loadProcessedRspMessageIds([messageId]);
  return processed.has(messageId);
}

async function markRspMessageProcessed(
  messageId: string,
  status: "IMPORTED" | "UNPARSED"
): Promise<void> {
  const supabase = await createServiceClient();
  await supabase.from("retail_price_gmail_messages").upsert(
    {
      message_id: messageId,
      status,
      processed_at: new Date().toISOString(),
    },
    { onConflict: "message_id" }
  );
}

export interface GmailRspScanResult {
  jobId: string;
  query: string;
  emailsFound: number;
  skippedAlready: number;
  pendingMessageIds: string[];
}

export interface GmailRspProcessResult {
  pricesUpserted: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export async function scanGmailRspRange(
  userId: string,
  dateFrom: string,
  dateToInclusive: string
): Promise<GmailRspScanResult> {
  const config = getGmailRspConfig();
  const query = buildGmailSearchQueryForRange(dateFrom, dateToInclusive, config);
  const period = getInclusiveDateRangePeriod(dateFrom, dateToInclusive);
  const gmail = await getAuthenticatedGmailClient(userId);
  const messageIds = await listGmailMessageIds(gmail, query);
  const processedIds = await loadProcessedRspMessageIds(messageIds);
  const { pendingMessageIds, skippedAlready } = partitionRspMessageIds(
    messageIds,
    processedIds
  );

  const jobId = await processingService.createJob(
    userId,
    messageIds.length,
    period,
    "GMAIL_RSP_FETCH"
  );

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

export async function scanGmailRspMonth(
  userId: string,
  year: number,
  month: number
): Promise<GmailRspScanResult> {
  const period = getMonthDateRange(year, month);
  const lastDay = new Date(year, month, 0).getDate();
  const dateToInclusive = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return scanGmailRspRange(userId, period.dateFrom, dateToInclusive);
}

export async function processGmailRspMessage(
  userId: string,
  messageId: string
): Promise<GmailRspProcessResult> {
  const errors: string[] = [];
  const config = getGmailRspConfig();

  if (await isRspMessageAlreadyProcessed(messageId)) {
    return { pricesUpserted: 0, skipped: 1, failed: 0, errors };
  }

  try {
    const gmail = await getAuthenticatedGmailClient(userId);
    const msgRes = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const body = extractPlainTextBody(msgRes.data);
    if (!body) {
      await markRspMessageProcessed(messageId, "UNPARSED");
      return {
        pricesUpserted: 0,
        skipped: 0,
        failed: 1,
        errors: [`No text body in message ${messageId}`],
      };
    }

    const subject = getMessageSubject(msgRes.data);
    const parsed = parseRspEmail(body, subject, config.customerCode);

    if (!parsed) {
      await markRspMessageProcessed(messageId, "UNPARSED");
      return {
        pricesUpserted: 0,
        skipped: 0,
        failed: 1,
        errors: [`Could not parse RSP email body for message ${messageId}`],
      };
    }

    const rows: RetailPriceRow[] = parsed.prices.map((price) => ({
      product: price.product,
      effective_from: parsed!.effectiveFrom,
      price_per_litre: price.pricePerLitre,
      notes: `Gmail RSP: ${price.label}${parsed!.effectiveTime ? ` @ ${parsed!.effectiveTime}` : ""}`,
      source_message_id: messageId,
      source_type: "GMAIL",
    }));

    const supabase = await createServiceClient();
    const count = await upsertRetailPrices(supabase, rows);
    await markRspMessageProcessed(messageId, "IMPORTED");

    return { pricesUpserted: count, skipped: 0, failed: 0, errors };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unauthorized or unknown error";
    errors.push(`Failed message ${messageId}: ${detail}`);
    return { pricesUpserted: 0, skipped: 0, failed: 1, errors };
  }
}

export async function finalizeGmailRspFetchJob(
  jobId: string,
  result: {
    emailsFound: number;
    pricesUpserted: number;
    skipped: number;
    failed: number;
  }
): Promise<void> {
  const supabase = await createServiceClient();
  await supabase
    .from("processing_jobs")
    .update({
      status: result.failed > 0 && result.pricesUpserted === 0 ? "FAILED" : "COMPLETED",
      total_files: result.emailsFound,
      processed_files: result.emailsFound,
      successful_files: result.pricesUpserted,
      failed_files: result.failed,
      skipped_files: result.skipped,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

// Re-export scope for tests if needed
export { GMAIL_SCOPES };
