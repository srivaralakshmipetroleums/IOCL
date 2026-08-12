import { describe, it, expect } from "vitest";
import { convertQuantity, convertLineItems } from "@/lib/invoices/quantity-converter";

describe("quantity-converter", () => {
  it("converts KL to Litres", () => {
    const result = convertQuantity(9, "KL");
    expect(result.output_quantity).toBe(9000);
    expect(result.output_measure).toBe("Litres");
  });

  it("converts 5 KL to 5000 Litres", () => {
    const result = convertQuantity(5, "KL");
    expect(result.output_quantity).toBe(5000);
    expect(result.output_measure).toBe("Litres");
  });

  it("passes through other units unchanged", () => {
    const result = convertQuantity(100, "KG");
    expect(result.output_quantity).toBe(100);
    expect(result.output_measure).toBe("KG");
  });

  it("converts line items batch", () => {
    const items = [
      { product: "EBMS", quantity: 9, unit: "KL", invoice_value: 1024074.15 },
      { product: "HSD-BSVI", quantity: 5, unit: "KL", invoice_value: 514768.18 },
    ];
    const converted = convertLineItems(items);
    expect(converted[0].output_quantity).toBe(9000);
    expect(converted[1].output_quantity).toBe(5000);
  });
});
