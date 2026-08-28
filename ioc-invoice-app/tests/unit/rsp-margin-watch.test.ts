import { describe, expect, it } from "vitest";
import { detectRspChanges } from "@/lib/pad/rsp-margin-watch";

describe("rsp margin watch", () => {
  it("detects RSP changes and spread impact", () => {
    const changes = detectRspChanges(
      [
        { product: "MS", effective_from: "2026-08-01", price_per_litre: 100, notes: null },
        { product: "MS", effective_from: "2026-08-15", price_per_litre: 102, notes: null },
      ],
      [
        {
          invoice_date: "2026-08-10",
          product: "EBMS",
          invoice_value: 10000,
          output_quantity: 100,
        },
      ],
      [{ business_date: "2026-08-10", msSaleLitres: 500, hsdSaleLitres: 0 }],
      { minSpreadPerLitre: 0.5 }
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].product).toBe("MS");
    expect(changes[0].effectiveFrom).toBe("2026-08-15");
    expect(changes[0].priceChange).toBe(2);
    expect(changes[0].avgPurchasePerL).toBe(100);
    expect(changes[0].spreadBefore).toBe(0);
    expect(changes[0].spreadAfter).toBe(2);
    expect(changes[0].belowThreshold).toBe(false);
    expect(changes[0].estimatedDailyImpact).toBe(1000);
  });

  it("flags spread below threshold", () => {
    const changes = detectRspChanges(
      [
        { product: "HSD", effective_from: "2026-08-01", price_per_litre: 90, notes: null },
        { product: "HSD", effective_from: "2026-08-20", price_per_litre: 90.2, notes: null },
      ],
      [
        {
          invoice_date: "2026-08-10",
          product: "HSD-BSVI",
          invoice_value: 9000,
          output_quantity: 100,
        },
      ],
      [],
      { minSpreadPerLitre: 0.5 }
    );

    expect(changes[0].spreadAfter).toBe(0.2);
    expect(changes[0].belowThreshold).toBe(true);
  });
});
