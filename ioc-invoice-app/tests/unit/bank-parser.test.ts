import path from "path";
import { describe, expect, it } from "vitest";
import { parseBankConsolidatedWorkbook } from "@/lib/bank/parse-consolidated-xlsx";
import { parseBankMonthlyXls } from "@/lib/bank/parse-monthly-xls";
import { parseBankStatementPdf } from "@/lib/bank/parse-pdf";

describe("bank consolidated workbook parser", () => {
  it("parses Apr21-Mar22 monthly sheets", async () => {
    const filename = "Apr21-Mar22 consolidated.xlsx";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "Consolidated", filename);
    const statements = await parseBankConsolidatedWorkbook(filePath, filename);

    expect(statements).toHaveLength(12);
    expect(statements[0].accountNumber).toBe("39441313694");
    expect(statements[0].accountName).toMatch(/VARALAKSHMI/i);
    expect(statements[0].periodFrom).toBe("2021-04-01");
    expect(statements[0].fyLabel).toBe("FY 2021-22");
    expect(statements[0].openingBalance).toBeCloseTo(121825.92, 2);
    expect(statements[0].transactions.length).toBeGreaterThan(50);

    const iocl = statements.flatMap((s) => s.transactions).filter((t) => t.category === "IOCL_PAYMENT");
    expect(iocl.length).toBeGreaterThan(0);
  }, 30000);

  it("skips the duplicate June sheet labeled jul-22", async () => {
    const filename = "Apr22-Mar23 consolidated.xlsx";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "Consolidated", filename);
    const statements = await parseBankConsolidatedWorkbook(filePath, filename);
    expect(statements).toHaveLength(12);
    const july = statements.find((s) => s.sourceSheet === "jul-22");
    expect(july?.periodFrom).toBe("2022-07-01");
    expect(july?.periodTo).toBe("2022-07-31");
    expect(july?.transactions.length).toBe(115);
  }, 30000);
});

describe("bank monthly .xls parser", () => {
  it("parses jan-21 TSV export", () => {
    const filename = "jan-21.xls";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "2021", filename);
    const parsed = parseBankMonthlyXls(filePath, filename);

    expect(parsed?.accountNumber).toBe("39441313694");
    expect(parsed?.periodFrom).toBe("2021-01-01");
    expect(parsed?.periodTo).toBe("2021-01-31");
    expect(parsed?.openingBalance).toBeCloseTo(465598.77, 2);
    expect(parsed?.transactions.length).toBeGreaterThan(50);
  });

  it("returns null for the empty feb-21 export", () => {
    const filename = "feb-21.xls";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "2021", filename);
    expect(parseBankMonthlyXls(filePath, filename)).toBeNull();
  });

  it("parses Jan-26 TSV export", () => {
    const filename = "Jan-26.xls";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "2026", filename);
    const parsed = parseBankMonthlyXls(filePath, filename);

    expect(parsed?.periodFrom).toBe("2026-01-01");
    expect(parsed?.periodTo).toBe("2026-01-31");
    expect(parsed?.openingBalance).toBeCloseTo(40351.22, 2);
    expect(parsed?.transactions.length).toBeGreaterThan(50);
  });
});

describe("bank PDF parser", () => {
  it("parses June 2020 SBI PDF", async () => {
    const filename = "June stmt.pdf";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "2020", filename);
    const parsed = await parseBankStatementPdf(filePath, filename);

    expect(parsed?.accountNumber).toBe("39441313694");
    expect(parsed?.periodFrom).toBe("2020-06-29");
    expect(parsed?.periodTo).toBe("2020-06-30");
    expect(parsed?.openingBalance).toBe(0);
    expect(parsed?.transactions).toHaveLength(12);
    expect(parsed?.closingBalance).toBeCloseTo(1960.88, 2);
  }, 30000);

  it("parses April 2025 SBI PDF", async () => {
    const filename = "04-25.pdf";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "PDF 2025", filename);
    const parsed = await parseBankStatementPdf(filePath, filename);

    expect(parsed?.periodFrom).toBe("2025-04-01");
    expect(parsed?.periodTo).toBe("2025-04-30");
    expect(parsed?.openingBalance).toBeCloseTo(110986.95, 2);
    expect(parsed?.transactions).toHaveLength(112);
    expect(parsed?.closingBalance).toBeCloseTo(170630.16, 2);
  }, 30000);

  it("parses the replacement February 2021 PDF", async () => {
    const filename = "feburary new.pdf";
    const filePath = path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS", "2021", filename);
    const parsed = await parseBankStatementPdf(filePath, filename);

    expect(parsed?.periodFrom).toBe("2021-02-01");
    expect(parsed?.periodTo).toBe("2021-02-28");
    expect(parsed?.openingBalance).toBeCloseTo(7331.7, 2);
    expect(parsed?.closingBalance).toBeCloseTo(26412.74, 2);
    expect(parsed?.transactions).toHaveLength(87);
  }, 30000);
});
