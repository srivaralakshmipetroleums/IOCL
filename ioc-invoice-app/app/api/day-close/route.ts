import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  getDayClosing,
  getRetailPriceOnDate,
  listRecentDayClosingDates,
  upsertDayClosing,
} from "@/lib/day-close/repository";
import { createServiceClient } from "@/lib/supabase/server";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const cashRowSchema = z.object({
  id: z.string().min(1),
  time: z.string(),
  amount: z.number().nonnegative(),
});

const describedRowSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  amount: z.number().nonnegative(),
});

const sheetSchema = z.object({
  testing: z.number().nonnegative(),
  oil_2t_packets: z.number().int().nonnegative(),
  other_lubes_qty: z.number().nonnegative(),
  other_lubes_rate: z.number().nonnegative(),
  other_lubes: z.number().nonnegative(),
  cash_rows: z.array(cashRowSchema).min(1).max(20),
  phonepe_paytm: z.number().nonnegative(),
  pos_cards: z.number().nonnegative(),
  credit_rows: z.array(describedRowSchema).min(1).max(20),
  expense_rows: z.array(describedRowSchema).min(1).max(20),
  pump_boy: z.string().nullable(),
});

const bodySchema = z.object({
  business_date: dateSchema,
  ms_n1_start: z.number().nonnegative(),
  ms_n1_close: z.number().nonnegative(),
  ms_n2_start: z.number().nonnegative(),
  ms_n2_close: z.number().nonnegative(),
  ms_rsp: z.number().positive().nullable(),
  hsd_n1_start: z.number().nonnegative(),
  hsd_n1_close: z.number().nonnegative(),
  hsd_n2_start: z.number().nonnegative(),
  hsd_n2_close: z.number().nonnegative(),
  hsd_rsp: z.number().positive().nullable(),
  ms: sheetSchema,
  hsd: sheetSchema,
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const parsedDate = dateSchema.safeParse(request.nextUrl.searchParams.get("date"));
  if (!parsedDate.success) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }
  const date = parsedDate.data;
  const supabase = await createServiceClient();
  const [closing, msRsp, hsdRsp, recentDates] = await Promise.all([
    getDayClosing(supabase, date),
    getRetailPriceOnDate(supabase, "MS", date),
    getRetailPriceOnDate(supabase, "HSD", date),
    listRecentDayClosingDates(supabase),
  ]);

  return NextResponse.json({
    closing,
    rsp: { MS: msRsp, HSD: hsdRsp },
    recentDates,
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = bodySchema.parse(await request.json());
  const supabase = await createServiceClient();
  await upsertDayClosing(supabase, body);
  return NextResponse.json({ ok: true });
}
