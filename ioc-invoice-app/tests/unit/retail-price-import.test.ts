import { describe, it, expect } from "vitest";
import { buildRetailPriceLookup, parseRetailPriceCsv } from "@/lib/pad/retail-price-lookup";

describe("retail price import", () => {
  it("skips invalid rows", () => {
    const csv = `product,effective_from,price_per_litre
MS,2024-01-01,100
INVALID,2024-01-01,100
MS,not-a-date,100`;

    expect(parseRetailPriceCsv(csv)).toHaveLength(1);
  });

  it("parses without header", () => {
    const csv = `MS,2024-01-01,102.5`;
    const rows = parseRetailPriceCsv(csv);
    expect(rows[0].price_per_litre).toBe(102.5);
  });

  it("uses the latest MS RSP on or before the lookup date", () => {
    const prices = [
      { product: "MS" as const, effective_from: "2021-03-09", price_per_litre: 97.43 },
      { product: "MS" as const, effective_from: "2026-01-01", price_per_litre: 109.87 },
      { product: "HSD" as const, effective_from: "2026-01-01", price_per_litre: 97.67 },
    ];

    const lookup = buildRetailPriceLookup(prices);
    expect(lookup("MS", "2026-01-15")).toBe(109.87);
    expect(lookup("MS", "2021-03-09")).toBe(97.43);
    expect(lookup("MS", "2021-03-08")).toBeNull();
  });
});
