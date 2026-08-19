import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGmailDateRange } from "@/lib/gmail/gmail-service";
import { fetchGmailRspDateRange } from "@/lib/gmail/gmail-rsp-service";
import { getLastNDaysRange } from "@/lib/invoices/period-utils";

export interface WeeklyGmailSyncResult {
  userId: string;
  dateFrom: string;
  dateToInclusive: string;
  invoices: Awaited<ReturnType<typeof fetchGmailDateRange>>;
  rsp: Awaited<ReturnType<typeof fetchGmailRspDateRange>>;
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

export async function runWeeklyGmailSync(options?: {
  days?: number;
  userId?: string;
}): Promise<WeeklyGmailSyncResult> {
  const days =
    options?.days ??
    Number(process.env.GMAIL_CRON_DAYS?.trim() || 7);

  if (!Number.isFinite(days) || days < 1) {
    throw new Error("GMAIL_CRON_DAYS must be a positive number");
  }

  const supabase = await createServiceClient();
  const userId = options?.userId ?? (await resolveCronGmailUserId(supabase));
  const { dateFrom, dateToInclusive } = getLastNDaysRange(days);

  const invoices = await fetchGmailDateRange(
    userId,
    dateFrom,
    dateToInclusive,
    "claude"
  );

  const rsp = await fetchGmailRspDateRange(userId, dateFrom, dateToInclusive);

  return {
    userId,
    dateFrom,
    dateToInclusive,
    invoices,
    rsp,
  };
}
