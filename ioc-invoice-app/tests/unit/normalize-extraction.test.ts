import { describe, it, expect } from "vitest";
import { normalizeDate, normalizeExtraction } from "@/lib/invoices/normalize-extraction";
import { resolveIoclInvoiceNumber } from "@/lib/invoices/iocl-invoice-number";
import type { ExtractedInvoice } from "@/lib/extraction/types";

describe("normalizeDate", () => {
  it("normalizes ISO date", () => {
    expect(normalizeDate("2026-07-31")).toBe("2026-07-31");
  });

  it("normalizes dd-Mon-yy format", () => {
    expect(normalizeDate("31-Jul-26")).toBe("2026-07-31");
  });
});

describe("resolveIoclInvoiceNumber", () => {
  it("prefers 10-digit SAP entry over alphanumeric commercial number", () => {
    expect(resolveIoclInvoiceNumber("20264438B025811", "7004932630")).toBe("7004932630");
  });

  it("keeps SAP number when already used as invoice_number", () => {
    expect(resolveIoclInvoiceNumber("7009317047", "7009317047")).toBe("7009317047");
  });
});

describe("normalizeExtraction", () => {
  it("stores SAP entry as invoice_number", () => {
    const extracted: ExtractedInvoice = {
      invoice: {
        invoice_number: "20274438B009795",
        invoice_date: "2026-07-31",
        supplier_name: "Indian Oil Corporation Limited",
        sap_entry_number: "7009317047",
        invoice_total: 100,
      },
      line_items: [
        { product: "EBMS", quantity: 1, unit: "KL", invoice_value: 100 },
      ],
    };

    const normalized = normalizeExtraction(extracted);
    expect(normalized.invoice.invoice_number).toBe("7009317047");
    expect(normalized.invoice.sap_entry_number).toBe("7009317047");
  });
});
