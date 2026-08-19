import { describe, it, expect } from "vitest";
import {
  extractPadBillingDoc,
  reconcilePadWithInvoices,
} from "@/lib/pad/reconciliation";
import type { PadTransactionRow } from "@/lib/pad/types";

function padTx(overrides: Partial<PadTransactionRow>): PadTransactionRow {
  return {
    id: "p1",
    statement_id: "s1",
    line_number: 1,
    plant: null,
    item_text: "0731341681 ': PRODUCT SUPPLY INVOICE - SALES",
    document_type: "Billing doc.transfer",
    document_number: "0731341681 ': PRODUCT SUPPLY INVOICE - SALES",
    transaction_date: "2024-06-01",
    material_group: "BULK-HSD",
    quantity: 8,
    unit: "KL",
    debit: 800000,
    credit: 0,
    balance: 0,
    category: "FUEL_HSD",
    ...overrides,
  };
}

describe("pad reconciliation", () => {
  it("extracts billing document number", () => {
    expect(extractPadBillingDoc("0731341681 ': PRODUCT SUPPLY INVOICE", "")).toBe(
      "0731341681"
    );
  });

  it("flags matched rows", () => {
    const rows = reconcilePadWithInvoices(
      [padTx({})],
      [
        {
          id: "i1",
          invoice_number: "0731341681",
          invoice_date: "2024-06-01",
          invoice_total: 800000,
          quantityKl: 8,
        },
      ]
    );

    expect(rows[0].status).toBe("MATCHED");
  });

  it("flags amount mismatch", () => {
    const rows = reconcilePadWithInvoices(
      [padTx({ debit: 750000 })],
      [
        {
          id: "i1",
          invoice_number: "0731341681",
          invoice_date: "2024-06-01",
          invoice_total: 800000,
          quantityKl: 8,
        },
      ]
    );

    expect(rows[0].status).toBe("AMOUNT_MISMATCH");
  });

  it("flags pad-only rows", () => {
    const rows = reconcilePadWithInvoices([padTx({})], []);
    expect(rows[0].status).toBe("PAD_ONLY");
  });

  it("flags invoice-only rows", () => {
    const rows = reconcilePadWithInvoices([], [
      {
        id: "i1",
        invoice_number: "0999999999",
        invoice_date: "2024-06-01",
        invoice_total: 100000,
        quantityKl: 1,
      },
    ]);

    expect(rows[0].status).toBe("INVOICE_ONLY");
  });

  it("matches PAD billing doc to sap_entry_number when invoice_number is alphanumeric", () => {
    const rows = reconcilePadWithInvoices(
      [padTx({ document_number: "7004932630", item_text: "7004932630 PRODUCT SUPPLY INVOICE" })],
      [
        {
          id: "i1",
          invoice_number: "20264438B025811",
          sap_entry_number: "7004932630",
          invoice_date: "2026-03-31",
          invoice_total: 800000,
          quantityKl: 8,
        },
      ]
    );

    expect(rows[0].status).toBe("MATCHED");
    expect(rows[0].billingDoc).toBe("7004932630");
  });

  it("matches older PAD rows that only store the billing document number", () => {
    const rows = reconcilePadWithInvoices(
      [
        padTx({
          item_text: "0732293889",
          document_number: "0732293889",
          debit: 1575413,
          quantity: 10,
        }),
      ],
      [
        {
          id: "i1",
          invoice_number: "732293889",
          sap_entry_number: "732293889",
          invoice_date: "2020-06-30",
          invoice_total: 1575413,
          quantityKl: 20,
        },
      ]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("MATCHED");
    expect(rows[0].billingDoc).toBe("0732293889");
  });

  it("treats same billing doc and amount as matched even when quantity differs", () => {
    const rows = reconcilePadWithInvoices(
      [padTx({ quantity: 8, debit: 1183938 })],
      [
        {
          id: "i1",
          invoice_number: "0731341681",
          invoice_date: "2024-06-03",
          invoice_total: 1183938,
          quantityKl: 12,
        },
      ]
    );

    expect(rows[0].status).toBe("MATCHED");
    expect(rows[0].mismatchReason).toBeNull();
  });
});
