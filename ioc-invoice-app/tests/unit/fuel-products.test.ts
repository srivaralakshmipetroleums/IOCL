import { describe, it, expect } from "vitest";
import { isFuelProduct, normalizeFuelProduct } from "@/lib/dashboard/fuel-products";

describe("fuel-products", () => {
  it("normalizes EBMS and HSD-BSVI", () => {
    expect(normalizeFuelProduct("EBMS")).toBe("EBMS");
    expect(normalizeFuelProduct("HSD-BSVI")).toBe("HSD-BSVI");
  });

  it("excludes tax and cess line items", () => {
    expect(normalizeFuelProduct("ZUNT Cess")).toBeNull();
    expect(normalizeFuelProduct("JIN6 A/R Vat Payable")).toBeNull();
    expect(normalizeFuelProduct("ZSST Additional VAT (Amt)")).toBeNull();
    expect(isFuelProduct("ZSST Additional VAT (Amt)")).toBe(false);
  });
});
