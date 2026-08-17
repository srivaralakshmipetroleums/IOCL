import { describe, it, expect } from "vitest";
import { mapRspFileProduct, parseRspFileRows } from "@/lib/pad/parse-rsp-file";

describe("parseRspFileRows", () => {
  it("maps HSD and prefers MS - BS VI over blend variants", () => {
    const rows = parseRspFileRows(
      [
        { product: "20% ETH. BLN. MS BS VI", partNum: "16730", price: 109.5, effectiveFrom: "2024-03-16" },
        { product: "HSD - BS VI", partNum: 50700, price: 97.62, effectiveFrom: "2024-03-16" },
        { product: "MS - BS VI", partNum: "16700", price: 109.82, effectiveFrom: "2024-03-16" },
        { product: "MS-BSVI-FOR RS W/O BLENDING", partNum: "16701", price: 109.82, effectiveFrom: "2024-03-16" },
      ],
      "RSP_APR-23 to MAR-24.xlsx"
    );

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.product === "MS")?.price_per_litre).toBe(109.82);
    expect(rows.find((r) => r.product === "HSD")?.price_per_litre).toBe(97.62);
    expect(rows.find((r) => r.product === "MS")?.notes).toContain("MS - BS VI");
  });

  it("uses ethanol blend when MS - BS VI is missing", () => {
    const rows = parseRspFileRows([
      { product: "20% ETH. BLN. MS BS VI", partNum: "16730", price: 112, effectiveFrom: "2024-03-01" },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].product).toBe("MS");
    expect(rows[0].price_per_litre).toBe(112);
  });

  it("maps part numbers to products", () => {
    expect(mapRspFileProduct("anything", "50700")).toBe("HSD");
    expect(mapRspFileProduct("MS - BS VI", "16700")).toBe("MS");
  });
});
