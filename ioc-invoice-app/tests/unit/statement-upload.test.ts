import { describe, expect, it } from "vitest";
import { parseBankUpload } from "@/lib/bank/parse-upload";
import { parsePadUpload } from "@/lib/pad/parse-upload";

describe("parsePadUpload", () => {
  it("rejects non-xls files", () => {
    expect(() => parsePadUpload(Buffer.from("hello"), "notes.txt")).toThrow(
      "PAD exports must be .xls"
    );
  });

  it("rejects xls files that are not PAD HTML exports", () => {
    expect(() => parsePadUpload(Buffer.from("date\tamount\n"), "bank.xls")).toThrow(
      "does not look like an IOCL PAD HTML export"
    );
  });
});

describe("parseBankUpload", () => {
  it("rejects unsupported extensions", async () => {
    await expect(parseBankUpload(Buffer.from("hello"), "notes.csv")).rejects.toThrow(
      "Unsupported file type"
    );
  });
});
