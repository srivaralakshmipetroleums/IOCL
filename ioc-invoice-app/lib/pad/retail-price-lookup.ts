import type { RetailPriceRow, RetailProduct } from "@/lib/pad/types";

function normalizeRetailDate(value: string): string {
  return value.slice(0, 10);
}

export function buildRetailPriceLookup(prices: RetailPriceRow[]) {
  const byProduct: Record<RetailProduct, RetailPriceRow[]> = { MS: [], HSD: [] };

  for (const row of prices) {
    if (row.product !== "MS" && row.product !== "HSD") continue;
    byProduct[row.product].push({
      ...row,
      effective_from: normalizeRetailDate(row.effective_from),
    });
  }

  for (const product of ["MS", "HSD"] as const) {
    byProduct[product].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  }

  return function lookup(product: RetailProduct, date: string): number | null {
    const list = byProduct[product];
    const target = normalizeRetailDate(date);
    let match: RetailPriceRow | null = null;
    for (const row of list) {
      if (row.effective_from <= target) {
        match = row;
      } else {
        break;
      }
    }
    return match?.price_per_litre ?? null;
  };
}

export function parseRetailPriceCsv(content: string): RetailPriceRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const header = lines[0].toLowerCase();
  const hasHeader = header.includes("product") && header.includes("effective");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows: RetailPriceRow[] = [];

  for (const line of dataLines) {
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) continue;

    const product = parts[0].toUpperCase() as RetailProduct;
    if (product !== "MS" && product !== "HSD") continue;

    const effectiveFrom = normalizeDate(parts[1]);
    const price = Number(parts[2]);
    if (!effectiveFrom || !Number.isFinite(price) || price <= 0) continue;

    rows.push({
      product,
      effective_from: effectiveFrom,
      price_per_litre: price,
      notes: parts[3] || null,
    });
  }

  return rows;
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dmy = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
