import { describe, it, expect } from "vitest";
import { normalizeDate } from "@/lib/invoices/normalize-extraction";

describe("normalizeDate", () => {
  it("normalizes ISO date", () => {
    expect(normalizeDate("2026-07-31")).toBe("2026-07-31");
  });

  it("normalizes dd-Mon-yy format", () => {
    expect(normalizeDate("31-Jul-26")).toBe("2026-07-31");
  });
});
