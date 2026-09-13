import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGmailDateRange } from "@/lib/gmail/gmail-service";
import { fetchGmailRspDateRange } from "@/lib/gmail/gmail-rsp-service";
import { getLastNDaysRange } from "@/lib/invoices/period-utils";

export interface WeeklyGmailSyncContext {
  userId: string;
  dateFrom: string;
  dateToInclusive: string;
}

export interface WeeklyGmailInvoiceSyncResult extends WeeklyGmailSyncContext {
  invoices: Awaited<ReturnType<typeof fetchGmailDateRange>>;
}

export interface WeeklyGmailRspSyncResult extends WeeklyGmailSyncContext {
  rsp: Awaited<ReturnType<typeof fetchGmailRspDateRange>>;
}

export interface WeeklyGmailSyncResult extends WeeklyGmailSyncContext {
  invoices: WeeklyGmailInvoiceSyncResult["invoices"];
  rsp: WeeklyGmailRspSyncResult["rsp"];
}

async function resolveCronGmailUserId(supabase: SupabaseClient): Promise<string> {
  const configured = process.env.GMAIL_CRON_USER_ID?.trim();
  if (configured) return configured;

  const { data, error } = await supabase
    .from("gmail_connections")
    .select("user_id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id) {
    throw new Error(
      "No Gmail connection found. Connect Gmail in the app or set GMAIL_CRON_USER_ID in .env.local"
    );
  }

  return data.user_id as string;
}

function resolveCronDays(options?: { days?: number }): number {
  const days =
    options?.days ??
    Number(process.env.GMAIL_CRON_DAYS?.trim() || 7);

  if (!Number.isFinite(days) || days < 1) {
    throw new Error("GMAIL_CRON_DAYS must be a positive number");
  }

  return days;
}

export async function resolveWeeklyGmailSyncContext(options?: {
  days?: number;
  userId?: string;
}): Promise<WeeklyGmailSyncContext> {
  const days = resolveCronDays(options);
  const supabase = await createServiceClient();
  const userId = options?.userId ?? (await resolveCronGmailUserId(supabase));
  const { dateFrom, dateToInclusive } = getLastNDaysRange(days);

  return { userId, dateFrom, dateToInclusive };
}

export async function runWeeklyGmailInvoiceSync(options?: {
  days?: number;
  userId?: string;
}): Promise<WeeklyGmailInvoiceSyncResult> {
  const context = await resolveWeeklyGmailSyncContext(options);
  const invoices = await fetchGmailDateRange(
    context.userId,
    context.dateFrom,
    context.dateToInclusive,
    "claude"
  );

  return { ...context, invoices };
}

export async function runWeeklyGmailRspSync(options?: {
  days?: number;
  userId?: string;
}): Promise<WeeklyGmailRspSyncResult> {
  const context = await resolveWeeklyGmailSyncContext(options);
  const rsp = await fetchGmailRspDateRange(
    context.userId,
    context.dateFrom,
    context.dateToInclusive
  );

  return { ...context, rsp };
}

export async function runWeeklyGmailSync(options?: {
  days?: number;
  userId?: string;
}): Promise<WeeklyGmailSyncResult> {
  const context = await resolveWeeklyGmailSyncContext(options);
  const invoices = await fetchGmailDateRange(
    context.userId,
    context.dateFrom,
    context.dateToInclusive,
    "claude"
  );
  const rsp = await fetchGmailRspDateRange(
    context.userId,
    context.dateFrom,
    context.dateToInclusive
  );

  return { ...context, invoices, rsp };
}
