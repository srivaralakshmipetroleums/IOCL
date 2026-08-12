import { describe, it, expect } from "vitest";
import { extractedInvoiceSchema } from "@/lib/validation/invoice-schema";
import { getFixtureInvoice } from "@/lib/extraction/local-extractor";

describe("invoice-schema", () => {
  it("validates fixture invoice", () => {
    const fixture = getFixtureInvoice();
    const result = extractedInvoiceSchema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it("rejects empty line items", () => {
    const result = extractedInvoiceSchema.safeParse({
      invoice: { invoice_number: "123", invoice_date: "2026-07-31", supplier_name: "Test" },
      line_items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing invoice number", () => {
    const result = extractedInvoiceSchema.safeParse({
      invoice: { invoice_date: "2026-07-31", supplier_name: "Test" },
      line_items: [{ product: "EBMS", quantity: 9, unit: "KL", invoice_value: 100 }],
    });
    expect(result.success).toBe(false);
  });
});
