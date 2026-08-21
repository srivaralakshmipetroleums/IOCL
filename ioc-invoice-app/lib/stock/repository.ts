import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockProduct, StockSnapshotKind, StockSnapshotRow, StockScope } from "@/lib/stock/types";

function mapRow(row: Record<string, unknown>): StockSnapshotRow {
  return {
    id: String(row.id),
    scope: row.scope as StockScope,
    period_key: String(row.period_key),
    product: row.product as StockProduct,
    snapshot_kind: row.snapshot_kind as StockSnapshotKind,
    quantity_litres: Number(row.quantity_litres),
    effective_date: String(row.effective_date),
    notes: row.notes != null ? String(row.notes) : null,
  };
}

export async function getStockSnapshots(supabase: SupabaseClient): Promise<StockSnapshotRow[]> {
  const { data, error } = await supabase
    .from("stock_snapshots")
    .select("*")
    .order("effective_date", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export interface UpsertStockSnapshotInput {
  scope: StockScope;
  period_key: string;
  product: StockProduct;
  snapshot_kind: StockSnapshotKind;
  quantity_litres: number;
  effective_date: string;
  notes?: string | null;
}

export async function upsertStockSnapshot(
  supabase: SupabaseClient,
  input: UpsertStockSnapshotInput
): Promise<void> {
  const { error } = await supabase.from("stock_snapshots").upsert(
    {
      scope: input.scope,
      period_key: input.period_key,
      product: input.product,
      snapshot_kind: input.snapshot_kind,
      quantity_litres: input.quantity_litres,
      effective_date: input.effective_date,
      notes: input.notes ?? null,
    },
    { onConflict: "scope,period_key,product,snapshot_kind" }
  );

  if (error) throw error;
}
