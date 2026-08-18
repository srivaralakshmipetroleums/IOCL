import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { categorizePadTransaction } from "@/lib/pad/categorize";
import {
  fyLabelFromFilename,
  parsePadDate,
  parsePadStatementHtml,
} from "@/lib/pad/parse-pad-statement";

describe("pad parser", () => {
  it("parses FY label from filename", () => {
    expect(fyLabelFromFilename("PAD STATEMENT APR-20 to MAR-21.xls")).toBe("FY 2020-21");
    expect(fyLabelFromFilename("PAD STATEMENT APR-25 to MAR-26.xls")).toBe("FY 2025-26");
  });

  it("parses PAD export dates", () => {
    expect(parsePadDate("29.05.20")).toBe("2020-05-29");
    expect(parsePadDate("01-Apr-2024")).toBe("2024-04-01");
  });

  it("categorizes common PAD transaction types", () => {
    expect(
      categorizePadTransaction("Billing doc.transfer", "0731341681", "BULK-HSD")
    ).toBe("FUEL_HSD");
    expect(
      categorizePadTransaction("Customer ECollection", "SBIN123", null)
    ).toBe("PAYMENT");
    expect(
      categorizePadTransaction(
        "Fleet- Card Posting",
        "4000523459-0000006 20250417012595",
        null
      )
    ).toBe("PAYMENT");
    expect(
      categorizePadTransaction(
        "Billing doc.transfer",
        "YVR464-4404-DEALER MARGIN FOR MAY",
        null
      )
    ).toBe("MARGIN");
  });

  it("parses a real PAD export file", () => {
    const filePath = path.resolve(
      process.cwd(),
      "..",
      "Docs",
      "PAD",
      "PAD STATEMENT APR-20 to MAR-21.xls"
    );
    const html = readFileSync(filePath, "utf8");
    const parsed = parsePadStatementHtml(html, "PAD STATEMENT APR-20 to MAR-21.xls");

    expect(parsed.fyLabel).toBe("FY 2020-21");
    expect(parsed.periodFrom).toBe("2020-04-01");
    expect(parsed.periodTo).toBe("2021-03-31");
    expect(parsed.customerCode).toBe("330042");
    expect(parsed.transactions.length).toBeGreaterThan(100);
    expect(parsed.closingBalance).toBeCloseTo(1058787.96, 2);

    const fuelRows = parsed.transactions.filter((row) => row.category.startsWith("FUEL_"));
    expect(fuelRows.length).toBeGreaterThan(0);
  });
});
