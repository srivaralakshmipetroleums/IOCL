import type { RetailPriceRow, RetailProduct } from "@/lib/pad/types";

export interface RspFileRow {
  product: string;
  partNum?: string | number | null;
  price: unknown;
  effectiveFrom: unknown;
}

const PART_PRIORITY: Record<string, number> = {
  "16700": 3, // MS - BS VI (pump petrol)
  "16730": 2, // 20% ethanol blend MS
  "16701": 1, // MS without blending
  "50700": 3, // HSD - BS VI
};

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in (value as { text?: string })) {
    return String((value as { text?: string }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in (value as { result?: unknown })) {
    return cellText((value as { result?: unknown }).result);
  }
  return String(value).trim();
}

function normalizeEffectiveFrom(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const text = cellText(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  return null;
}

export function mapRspFileProduct(
  product: string,
  partNum?: string | number | null
): RetailProduct | null {
  const part = cellText(partNum);
  const name = product.trim().toUpperCase();

  if (part === "50700" || name.includes("HSD")) return "HSD";
  if (part === "16700" || part === "16730" || part === "16701") return "MS";
  if (name.includes("MS")) return "MS";

  return null;
}

function partPriority(partNum?: string | number | null): number {
  return PART_PRIORITY[cellText(partNum)] ?? 0;
}

/** Collapse IOCL RSP export rows to one MS and one HSD price per effective date. */
export function parseRspFileRows(
  rows: RspFileRow[],
  sourceLabel?: string
): RetailPriceRow[] {
  const best = new Map<
    string,
    { row: RetailPriceRow; priority: number }
  >();

  for (const raw of rows) {
    const product = mapRspFileProduct(raw.product, raw.partNum);
    const effectiveFrom = normalizeEffectiveFrom(raw.effectiveFrom);
    const price = Number(raw.price);
    if (!product || !effectiveFrom || !Number.isFinite(price) || price <= 0) continue;

    const key = `${product}|${effectiveFrom}`;
    const priority = partPriority(raw.partNum);
    const existing = best.get(key);
    if (existing && existing.priority >= priority) continue;

    best.set(key, {
      priority,
      row: {
        product,
        effective_from: effectiveFrom,
        price_per_litre: price,
        notes: sourceLabel
          ? `${raw.product.trim()} (${sourceLabel})`
          : raw.product.trim(),
        source_type: "XLSX",
      },
    });
  }

  return [...best.values()]
    .map((entry) => entry.row)
    .sort(
      (a, b) =>
        a.effective_from.localeCompare(b.effective_from) ||
        a.product.localeCompare(b.product)
    );
}
