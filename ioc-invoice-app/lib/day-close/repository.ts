import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayCloseCashRow, DescribedAmountRow } from "@/lib/day-close/calculate";
import {
  extractDescribedSuggestions,
  type DayCloseDescribedSuggestions,
} from "@/lib/day-close/suggestions";

export type { DayCloseDescribedSuggestions };

export interface FuelSheetStored {
  testing: number;
  oil_2t_packets_10: number;
  oil_2t_packets_20: number;
  /** @deprecated kept in sync with oil_2t_packets_20 for older rows */
  oil_2t_packets: number;
  other_lubes_qty: number;
  other_lubes_rate: number;
  other_lubes: number;
  cash_rows: DayCloseCashRow[];
  phonepe_paytm: number;
  pos_cards: number;
  credit_rows: DescribedAmountRow[];
  expense_rows: DescribedAmountRow[];
  pump_boy: string | null;
}

export interface DayClosingRow {
  id: string;
  business_date: string;
  ms_n1_start: number;
  ms_n1_close: number;
  ms_n2_start: number;
  ms_n2_close: number;
  ms_rsp: number | null;
  hsd_n1_start: number;
  hsd_n1_close: number;
  hsd_n2_start: number;
  hsd_n2_close: number;
  hsd_rsp: number | null;
  ms: FuelSheetStored;
  hsd: FuelSheetStored;
  notes: string | null;
}

export interface UpsertDayClosingInput {
  business_date: string;
  ms_n1_start: number;
  ms_n1_close: number;
  ms_n2_start: number;
  ms_n2_close: number;
  ms_rsp: number | null;
  hsd_n1_start: number;
  hsd_n1_close: number;
  hsd_n2_start: number;
  hsd_n2_close: number;
  hsd_rsp: number | null;
  ms: FuelSheetStored;
  hsd: FuelSheetStored;
  notes?: string | null;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapCashRows(value: unknown): DayCloseCashRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : String(index + 1),
      time: item.time != null ? String(item.time) : item.label != null ? String(item.label) : "",
      amount: num(item.amount),
    };
  });
}

function mapDescribedRows(value: unknown): DescribedAmountRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row, index) => {
    const item = row as Record<string, unknown>;
    return {
      id: item.id != null ? String(item.id) : String(index + 1),
      description: item.description != null ? String(item.description) : "",
      amount: num(item.amount),
    };
  });
}

function mapSheet(row: Record<string, unknown>, prefix: "ms" | "hsd"): FuelSheetStored {
  const otherLubesQty = num(row[`${prefix}_other_lubes_qty`]);
  const otherLubesRate = num(row[`${prefix}_other_lubes_rate`]);
  const otherLubesAmount = num(row[`${prefix}_other_lubes`]);
  const legacyPackets = Math.round(num(row[`${prefix}_oil_2t_packets`]));
  const hasSplitCols =
    row[`${prefix}_oil_2t_packets_10`] != null || row[`${prefix}_oil_2t_packets_20`] != null;

  let packets10 = Math.round(num(row[`${prefix}_oil_2t_packets_10`]));
  let packets20 =
    row[`${prefix}_oil_2t_packets_20`] != null
      ? Math.round(num(row[`${prefix}_oil_2t_packets_20`]))
      : legacyPackets;

  // Legacy encode: oil_2t_packets = packets20 + packets10 * 1_000_000
  if (!hasSplitCols && legacyPackets >= 1_000_000) {
    packets10 = Math.floor(legacyPackets / 1_000_000);
    packets20 = legacyPackets % 1_000_000;
  }

  return {
    testing: num(row[`${prefix}_n1_testing`]) + num(row[`${prefix}_n2_testing`]),
    oil_2t_packets_10: packets10,
    oil_2t_packets_20: packets20,
    oil_2t_packets: packets20,
    other_lubes_qty: otherLubesQty,
    other_lubes_rate: otherLubesRate,
    other_lubes: otherLubesAmount,
    cash_rows: mapCashRows(row[`${prefix}_cash_rows`]),
    phonepe_paytm: num(row[`${prefix}_phonepe_paytm`]),
    pos_cards: num(row[`${prefix}_pos_cards`]),
    credit_rows: mapDescribedRows(row[`${prefix}_credit_rows`]),
    expense_rows: mapDescribedRows(row[`${prefix}_expense_rows`]),
    pump_boy: row[`${prefix}_pump_boy`] != null ? String(row[`${prefix}_pump_boy`]) : null,
  };
}

function mapRow(row: Record<string, unknown>): DayClosingRow {
  return {
    id: String(row.id),
    business_date: String(row.business_date).slice(0, 10),
    ms_n1_start: num(row.ms_n1_start),
    ms_n1_close: num(row.ms_n1_close),
    ms_n2_start: num(row.ms_n2_start),
    ms_n2_close: num(row.ms_n2_close),
    ms_rsp: row.ms_rsp == null ? null : num(row.ms_rsp),
    hsd_n1_start: num(row.hsd_n1_start),
    hsd_n1_close: num(row.hsd_n1_close),
    hsd_n2_start: num(row.hsd_n2_start),
    hsd_n2_close: num(row.hsd_n2_close),
    hsd_rsp: row.hsd_rsp == null ? null : num(row.hsd_rsp),
    ms: mapSheet(row, "ms"),
    hsd: mapSheet(row, "hsd"),
    notes: row.notes != null ? String(row.notes) : null,
  };
}

function sheetColumns(prefix: "ms" | "hsd", sheet: FuelSheetStored) {
  return {
    [`${prefix}_n1_testing`]: sheet.testing,
    [`${prefix}_n2_testing`]: 0,
    [`${prefix}_oil_2t_packets`]: sheet.oil_2t_packets_20,
    [`${prefix}_oil_2t_packets_10`]: sheet.oil_2t_packets_10,
    [`${prefix}_oil_2t_packets_20`]: sheet.oil_2t_packets_20,
    [`${prefix}_other_lubes_qty`]: sheet.other_lubes_qty,
    [`${prefix}_other_lubes_rate`]: sheet.other_lubes_rate,
    [`${prefix}_other_lubes`]: sheet.other_lubes,
    [`${prefix}_cash_rows`]: sheet.cash_rows,
    [`${prefix}_phonepe_paytm`]: sheet.phonepe_paytm,
    [`${prefix}_pos_cards`]: sheet.pos_cards,
    [`${prefix}_credit_rows`]: sheet.credit_rows,
    [`${prefix}_expense_rows`]: sheet.expense_rows,
    [`${prefix}_pump_boy`]: sheet.pump_boy,
  };
}

export async function getRetailPriceOnDate(
  supabase: SupabaseClient,
  product: "MS" | "HSD",
  date: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("retail_selling_prices")
    .select("price_per_litre")
    .eq("product", product)
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const price = Number(data.price_per_litre);
  return Number.isFinite(price) ? price : null;
}

export async function getDayClosing(
  supabase: SupabaseClient,
  date: string
): Promise<DayClosingRow | null> {
  const { data, error } = await supabase
    .from("day_closings")
    .select("*")
    .eq("business_date", date)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function listRecentDayClosingDates(
  supabase: SupabaseClient,
  limit = 14
): Promise<string[]> {
  const { data, error } = await supabase
    .from("day_closings")
    .select("business_date")
    .order("business_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => String(row.business_date).slice(0, 10));
}

export async function listDayCloseDescribedSuggestions(
  supabase: SupabaseClient,
  limit = 180
): Promise<DayCloseDescribedSuggestions> {
  const { data, error } = await supabase
    .from("day_closings")
    .select("ms_credit_rows, hsd_credit_rows, ms_expense_rows, hsd_expense_rows")
    .order("business_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return extractDescribedSuggestions(data ?? []);
}

export async function upsertDayClosing(
  supabase: SupabaseClient,
  input: UpsertDayClosingInput
): Promise<void> {
  const msCols = sheetColumns("ms", input.ms);
  const hsdCols = sheetColumns("hsd", input.hsd);

  const baseRow = {
    business_date: input.business_date,
    ms_n1_start: input.ms_n1_start,
    ms_n1_close: input.ms_n1_close,
    ms_n2_start: input.ms_n2_start,
    ms_n2_close: input.ms_n2_close,
    ms_rsp: input.ms_rsp,
    hsd_n1_start: input.hsd_n1_start,
    hsd_n1_close: input.hsd_n1_close,
    hsd_n2_start: input.hsd_n2_start,
    hsd_n2_close: input.hsd_n2_close,
    hsd_rsp: input.hsd_rsp,
    ...msCols,
    ...hsdCols,
    notes: input.notes ?? null,
  };

  const { error } = await supabase.from("day_closings").upsert(baseRow, {
    onConflict: "business_date",
  });

  if (!error) return;

  // Older DBs may not have *_oil_2t_packets_10 / *_20 yet — fall back.
  if (!/oil_2t_packets_1[02]/i.test(error.message)) throw error;

  const {
    ms_oil_2t_packets_10: _ms10,
    ms_oil_2t_packets_20: _ms20,
    hsd_oil_2t_packets_10: _hsd10,
    hsd_oil_2t_packets_20: _hsd20,
    ...legacyRow
  } = baseRow as Record<string, unknown>;

  // Persist both packet prices in the legacy integer until split columns exist.
  legacyRow.ms_oil_2t_packets =
    input.ms.oil_2t_packets_20 + input.ms.oil_2t_packets_10 * 1_000_000;
  legacyRow.hsd_oil_2t_packets =
    input.hsd.oil_2t_packets_20 + input.hsd.oil_2t_packets_10 * 1_000_000;

  const { error: legacyError } = await supabase.from("day_closings").upsert(legacyRow, {
    onConflict: "business_date",
  });
  if (legacyError) throw legacyError;
}
