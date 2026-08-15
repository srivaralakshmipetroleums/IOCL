import { describe, it, expect } from "vitest";
import { getMonthRange } from "@/lib/dashboard/filters";
import {
  getCurrentMonthPeriod,
  getFinancialYearPeriod,
  getLast6MonthsPeriod,
  getMultiMonthPeriod,
  getSelectedMonthPeriod,
} from "@/lib/dashboard/period";

describe("dashboard filters", () => {
  it("getMonthRange uses local calendar dates without UTC shift", () => {
    expect(getMonthRange(2026, 3)).toEqual({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });
  });
});

describe("dashboard period", () => {
  it("selects the requested month correctly", () => {
    const period = getSelectedMonthPeriod(2026, 3);
    expect(period.dateFrom).toBe("2026-03-01");
    expect(period.dateTo).toBe("2026-03-31");
    expect(period.label).toContain("March");
  });

  it("builds last 6 months period", () => {
    const period = getLast6MonthsPeriod(new Date(2026, 7, 15));
    expect(period.dateFrom).toBe("2026-03-01");
    expect(period.dateTo).toBe("2026-08-31");
    expect(period.months).toHaveLength(6);
  });

  it("builds financial year period", () => {
    const period = getFinancialYearPeriod(2025);
    expect(period.dateFrom).toBe("2025-04-01");
    expect(period.dateTo).toBe("2026-03-31");
  });

  it("builds non-contiguous multi-month period", () => {
    const period = getMultiMonthPeriod(["2026-03", "2026-05"]);
    expect(period?.dateFrom).toBe("2026-03-01");
    expect(period?.dateTo).toBe("2026-05-31");
    expect(period?.months).toEqual(["2026-03", "2026-05"]);
  });

  it("defaults to current month", () => {
    const period = getCurrentMonthPeriod(new Date(2026, 7, 15));
    expect(period.dateFrom).toBe("2026-08-01");
    expect(period.dateTo).toBe("2026-08-31");
  });
});
