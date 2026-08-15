import { describe, it, expect } from "vitest";
import { convertLineItems } from "@/lib/invoices/quantity-converter";
import { getFixtureInvoice } from "@/lib/extraction/local-extractor";
import { REPORT_COLUMNS } from "@/lib/excel/report-format";
import {
  buildReportFilename,
  buildReportTitle,
  buildSheetName,
  formatExcelDate,
} from "@/lib/excel/report-format";

describe("excel-mapping", () => {
  it("has correct report column headers", () => {
    expect(REPORT_COLUMNS).toEqual([
      "Date",
      "Name of the Supplier",
      "Bill No",
      "Product",
      "Invoice Value (₹)",
      "HSN Code",
      "Quantity",
      "Measure",
    ]);
  });

  it("formats report filename and title for July 2026", () => {
    expect(buildReportFilename("2026-07-01")).toBe("IOC_Invoices_July_2026.xlsx");
    expect(buildSheetName("2026-07-01")).toBe("Jul 2026 Invoices");
    expect(buildReportTitle("2026-07-01")).toBe(
      "Indian Oil Corporation — Invoice Report  |  July 2026"
    );
    expect(formatExcelDate("2026-07-04")).toBe("04-Jul-26");
  });

  it("fixture EBMS row matches PRD values", () => {
    const fixture = getFixtureInvoice();
    const converted = convertLineItems(fixture.line_items);
    const ebms = converted.find((i) => i.product === "EBMS")!;

    expect(ebms.quantity).toBe(9);
    expect(ebms.output_quantity).toBe(9000);
    expect(ebms.output_measure).toBe("Litres");
    expect(ebms.invoice_value).toBe(1024074.15);
    expect(ebms.hsn_code).toBe("2710 12 42");
  });

  it("fixture HSD-BSVI row matches PRD values", () => {
    const fixture = getFixtureInvoice();
    const converted = convertLineItems(fixture.line_items);
    const hsd = converted.find((i) => i.product === "HSD-BSVI")!;

    expect(hsd.quantity).toBe(5);
    expect(hsd.output_quantity).toBe(5000);
    expect(hsd.output_measure).toBe("Litres");
    expect(hsd.invoice_value).toBe(514768.18);
    expect(hsd.hsn_code).toBe("2710 19 44");
  });

  it("fixture invoice number is 7009317047", () => {
    const fixture = getFixtureInvoice();
    expect(fixture.invoice.invoice_number).toBe("7009317047");
    expect(fixture.invoice.invoice_date).toBe("2026-07-31");
  });
});
