import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseBankUpload } from "@/lib/bank/parse-upload";
import { parsePadUpload } from "@/lib/pad/parse-upload";

describe("parsePadUpload", () => {
  it("rejects non-xls files", () => {
    expect(() => parsePadUpload(Buffer.from("hello"), "notes.txt")).toThrow(
      "PAD exports must be .xls"
    );
  });

  it("rejects xls files that are not PAD exports", () => {
    expect(() => parsePadUpload(Buffer.from("date\tamount\n"), "bank.xls")).toThrow(
      "does not look like an IOCL PAD export"
    );
  });

  it("accepts IOCL PAD html fragment exports without an html tag", () => {
    const sample = readFileSync(
      path.resolve(process.cwd(), "..", "Docs", "PAD", "PAD STATEMENT APR-26 to JULY-26.xls")
    );
    const parsed = parsePadUpload(sample, "PAD STATEMENT APR-26 to JULY-26.xls");
    expect(parsed.periodFrom).toBe("2026-04-01");
    expect(parsed.periodTo).toBe("2026-07-31");
    expect(parsed.transactions.length).toBeGreaterThan(0);
  });

  it("parses monthly portal download Report (3).xls for August 2026", () => {
    const sample = readFileSync(
      path.resolve(process.cwd(), "..", "Docs", "PAD", "Report (3).xls")
    );
    const parsed = parsePadUpload(sample, "Report (3).xls");
    expect(parsed.periodFrom).toBe("2026-08-01");
    expect(parsed.periodTo).toBe("2026-08-31");
    expect(parsed.transactions.length).toBe(48);
    expect(parsed.closingBalance).toBeCloseTo(1490135.24, 2);
  });
});

describe("parseBankUpload", () => {
  it("rejects unsupported extensions", async () => {
    await expect(parseBankUpload(Buffer.from("hello"), "notes.csv")).rejects.toThrow(
      "Unsupported file type"
    );
  });
});
