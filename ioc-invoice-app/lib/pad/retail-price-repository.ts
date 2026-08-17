import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetailPriceRow } from "@/lib/pad/types";

export async function upsertRetailPrices(
  supabase: SupabaseClient,
  rows: RetailPriceRow[]
): Promise<number> {
  if (!rows.length) return 0;

  const payload = rows.map((row) => ({
    product: row.product,
    effective_from: row.effective_from,
    price_per_litre: row.price_per_litre,
    notes: row.notes ?? null,
    source_message_id: row.source_message_id ?? null,
    source_type: row.source_type ?? null,
  }));

  const { error } = await supabase
    .from("retail_selling_prices")
    .upsert(payload, { onConflict: "product,effective_from" });

  if (error) throw error;
  return rows.length;
}
