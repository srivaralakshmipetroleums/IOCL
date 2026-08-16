import { describe, it, expect } from "vitest";
import { allocateFuelInvoiceValues } from "@/lib/dashboard/fuel-line-values";

describe("allocateFuelInvoiceValues", () => {
  it("allocates invoice total to a single EBMS line when VAT/cess lines exist", () => {
    const fuelItems = [
      { id: "ebms-1", invoice_id: "inv-1", product: "EBMS", invoice_value: 1074103.24 },
    ];
    const allItems = [
      ...fuelItems,
      { invoice_id: "inv-1", product: "JIN6 A/R Vat Payable", invoice_value: 337312 },
      { invoice_id: "inv-1", product: "ZUNT Cess", invoice_value: 14000 },
    ];
    const invoices = [{ id: "inv-1", invoice_total: 1481415 }];

    const values = allocateFuelInvoiceValues(fuelItems, allItems, invoices);
    expect(values.get("ebms-1")).toBeCloseTo(1481415, 2);
  });

  it("allocates invoice total to a single HSD-BSVI line when VAT/cess lines exist", () => {
    const fuelItems = [
      { id: "hsd-1", invoice_id: "inv-1", product: "HSD-BSVI", invoice_value: 855761.07 },
    ];
    const allItems = [
      ...fuelItems,
      { invoice_id: "inv-1", product: "JIN6 A/R Vat Payable", invoice_value: 337312 },
      { invoice_id: "inv-1", product: "ZUNT Cess", invoice_value: 14000 },
      { invoice_id: "inv-1", product: "ZSST Additional VAT (Amt)", invoice_value: 56000 },
    ];
    const invoices = [{ id: "inv-1", invoice_total: 1263073.07 }];

    const values = allocateFuelInvoiceValues(fuelItems, allItems, invoices);
    expect(values.get("hsd-1")).toBeCloseTo(1263073.07, 2);
  });

  it("splits invoice total proportionally across EBMS and HSD when VAT/cess lines exist", () => {
    const fuelItems = [
      { id: "ebms-1", invoice_id: "inv-1", product: "EBMS", invoice_value: 500000 },
      { id: "hsd-1", invoice_id: "inv-1", product: "HSD-BSVI", invoice_value: 500000 },
    ];
    const allItems = [
      ...fuelItems,
      { invoice_id: "inv-1", product: "JIN6 A/R Vat Payable", invoice_value: 200000 },
    ];
    const invoices = [{ id: "inv-1", invoice_total: 1200000 }];

    const values = allocateFuelInvoiceValues(fuelItems, allItems, invoices);
    expect(values.get("ebms-1")).toBeCloseTo(600000, 2);
    expect(values.get("hsd-1")).toBeCloseTo(600000, 2);
  });

  it("keeps raw fuel values when no non-fuel lines exist", () => {
    const fuelItems = [
      { id: "ebms-1", invoice_id: "inv-1", product: "EBMS", invoice_value: 529076.87 },
      { id: "hsd-1", invoice_id: "inv-1", product: "HSD-BSVI", invoice_value: 855761.07 },
    ];

    const values = allocateFuelInvoiceValues(fuelItems, fuelItems, [
      { id: "inv-1", invoice_total: 1384838 },
    ]);

    expect(values.get("ebms-1")).toBe(529076.87);
    expect(values.get("hsd-1")).toBe(855761.07);
  });
});
