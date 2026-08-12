import { describe, it, expect } from "vitest";
import { DuplicateService } from "@/lib/invoices/duplicate-service";

describe("duplicate detection", () => {
  it("DuplicateService class exists with findDuplicate method", () => {
    const service = new DuplicateService();
    expect(typeof service.findDuplicate).toBe("function");
    expect(typeof service.markAsDuplicate).toBe("function");
  });
});
