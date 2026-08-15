import { describe, it, expect } from "vitest";
import {
  getDateSearchVariants,
  matchesDateSearch,
  parseMonthSearch,
  parseSearchDate,
} from "@/lib/search/date-search";

describe("date-search", () => {
  it("parses DD/MM/YYYY", () => {
    expect(parseSearchDate("29/05/2026")).toBe("2026-05-29");
    expect(parseSearchDate("02/06/2024")).toBe("2024-06-02");
    expect(parseSearchDate("2/6/2024")).toBe("2024-06-02");
  });

  it("parses YYYY-MM-DD", () => {
    expect(parseSearchDate("2026-05-29")).toBe("2026-05-29");
  });

  it("parses month search", () => {
    expect(parseMonthSearch("05/2026")).toEqual({
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    });
  });

  it("matches date search variants", () => {
    expect(matchesDateSearch("29/05/2026", "2026-05-29")).toBe(true);
    expect(matchesDateSearch("05/2026", "2026-05-29")).toBe(true);
    expect(matchesDateSearch("29 May 26", "2026-05-29")).toBe(true);
    expect(matchesDateSearch("29/05/2026", "2026-05-30")).toBe(false);
  });

  it("builds searchable date variants", () => {
    const variants = getDateSearchVariants("2026-05-29");
    expect(variants).toContain("2026-05-29");
    expect(variants).toContain("29/05/2026");
    expect(variants.some((v) => v.toLowerCase().includes("may"))).toBe(true);
  });
});
