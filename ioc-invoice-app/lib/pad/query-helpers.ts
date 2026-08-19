import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import type { PadStatementRow, PadTransactionRow } from "@/lib/pad/types";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapTransaction(row: Record<string, unknown>): PadTransactionRow {
  return {
    id: String(row.id),
    statement_id: String(row.statement_id),
    line_number: Number(row.line_number),
    plant: (row.plant as string) ?? null,
    item_text: String(row.item_text ?? ""),
    document_type: (row.document_type as string) ?? null,
    document_number: (row.document_number as string) ?? null,
    transaction_date: (row.transaction_date as string) ?? null,
    material_group: (row.material_group as string) ?? null,
    quantity: row.quantity != null ? Number(row.quantity) : null,
    unit: (row.unit as string) ?? null,
    debit: toNumber(row.debit),
    credit: toNumber(row.credit),
    balance: row.balance != null ? Number(row.balance) : null,
    category: row.category as PadTransactionRow["category"],
  };
}

export function isFuelSupplyRow(row: PadTransactionRow): boolean {
  if (row.category !== "FUEL_MS" && row.category !== "FUEL_HSD") return false;

  const text = row.item_text.trim().toUpperCase();
  if (text.includes("PRODUCT SUPPLY INVOICE")) return true;

  // Older PAD exports store only the 10-digit billing doc as item text.
  return /^\d{10}$/.test(text) && (row.quantity ?? 0) > 0;
}

export function fuelProductFromCategory(row: PadTransactionRow): "MS" | "HSD" | null {
  if (row.category === "FUEL_MS") return "MS";
  if (row.category === "FUEL_HSD") return "HSD";
  return null;
}

export function monthKey(date: string | null): string | null {
  if (!date) return null;
  return date.slice(0, 7);
}

export async function getPadTransactions(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<PadTransactionRow[]> {
  let query = supabase
    .from("pad_transactions")
    .select("*")
    .neq("category", "SUMMARY")
    .order("transaction_date", { ascending: true })
    .order("line_number", { ascending: true });

  if (filters.dateFrom) {
    query = query.gte("transaction_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("transaction_date", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []).map(mapTransaction);

  if (filters.months?.length) {
    const allowed = new Set(filters.months);
    rows = rows.filter((row) => {
      const key = monthKey(row.transaction_date);
      return key ? allowed.has(key) : false;
    });
  }

  return rows;
}

export async function getPadStatements(
  supabase: SupabaseClient,
  filters: DashboardFilters
): Promise<PadStatementRow[]> {
  let query = supabase
    .from("pad_statements")
    .select(
      "id, fy_label, period_from, period_to, customer_name, customer_code, opening_balance, closing_balance, open_delivery_value"
    )
    .order("period_from", { ascending: true });

  if (filters.dateFrom) {
    query = query.gte("period_to", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("period_from", filters.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    fy_label: String(row.fy_label),
    period_from: String(row.period_from),
    period_to: String(row.period_to),
    customer_name: (row.customer_name as string) ?? null,
    customer_code: (row.customer_code as string) ?? null,
    opening_balance: row.opening_balance != null ? Number(row.opening_balance) : null,
    closing_balance: row.closing_balance != null ? Number(row.closing_balance) : null,
    open_delivery_value:
      row.open_delivery_value != null ? Number(row.open_delivery_value) : null,
  }));
}

export async function getRetailPrices(
  supabase: SupabaseClient,
  filters?: Pick<DashboardFilters, "dateFrom" | "dateTo" | "months">
) {
  const pageSize = 1000;
  const allData: Array<{
    id: string;
    product: string;
    effective_from: string;
    price_per_litre: number;
    notes: string | null;
  }> = [];

  for (const product of ["MS", "HSD"] as const) {
    let from = 0;

    while (true) {
      let query = supabase
        .from("retail_selling_prices")
        .select("id, product, effective_from, price_per_litre, notes")
        .eq("product", product)
        .order("effective_from", { ascending: true })
        .range(from, from + pageSize - 1);

      if (filters?.dateFrom) {
        query = query.gte("effective_from", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("effective_from", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const batch = data ?? [];
      allData.push(
        ...batch.map((row) => ({
          id: String(row.id),
          product: String(row.product),
          effective_from: String(row.effective_from),
          price_per_litre: Number(row.price_per_litre),
          notes: (row.notes as string) ?? null,
        }))
      );

      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }

  let rows = allData.map((row) => ({
    id: row.id,
    product: row.product as "MS" | "HSD",
    effective_from: row.effective_from.slice(0, 10),
    price_per_litre: row.price_per_litre,
    notes: row.notes,
  }));

  if (filters?.months?.length) {
    const allowed = new Set(filters.months);
    rows = rows.filter((row) => {
      const key = monthKey(row.effective_from);
      return key ? allowed.has(key) : false;
    });
  }

  return rows.sort((a, b) =>
    a.product === b.product
      ? a.effective_from.localeCompare(b.effective_from)
      : a.product.localeCompare(b.product)
  );
}
