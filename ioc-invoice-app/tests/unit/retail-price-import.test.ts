import { describe, it, expect } from "vitest";
import { parseRetailPriceCsv } from "@/lib/pad/retail-price-lookup";

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
});
