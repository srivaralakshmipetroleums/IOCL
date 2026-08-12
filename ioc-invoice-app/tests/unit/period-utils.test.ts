import { describe, it, expect } from "vitest";
import { getMonthDateRange, getYearDateRange, isDateInPeriod } from "@/lib/invoices/period-utils";

describe("period-utils", () => {
  it("July 2026 month range per PRD Gmail logic", () => {
    const period = getMonthDateRange(2026, 7);
    expect(period.dateFrom).toBe("2026-07-01");
    expect(period.dateTo).toBe("2026-08-01");
  });

  it("December crosses year boundary", () => {
    const period = getMonthDateRange(2026, 12);
    expect(period.dateFrom).toBe("2026-12-01");
    expect(period.dateTo).toBe("2027-01-01");
  });

  it("year range", () => {
    const period = getYearDateRange(2026);
    expect(period.dateFrom).toBe("2026-01-01");
    expect(period.dateTo).toBe("2027-01-01");
  });

  it("isDateInPeriod", () => {
    const period = getMonthDateRange(2026, 7);
    expect(isDateInPeriod("2026-07-31", period)).toBe(true);
    expect(isDateInPeriod("2026-08-01", period)).toBe(false);
  });
});
