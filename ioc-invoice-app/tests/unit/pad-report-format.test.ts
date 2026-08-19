import { describe, expect, it } from "vitest";
import {
  buildPadReportFilename,
  buildPadReportTitle,
  formatReportMonth,
  PAD_SHEET_NAMES,
  sanitizeFilenamePart,
} from "@/lib/reports/pad-report-format";

describe("pad report format", () => {
  it("names files from the period label", () => {
    expect(buildPadReportFilename("FY 2025-26", "xlsx")).toBe("PAD_Account_FY_2025-26.xlsx");
    expect(buildPadReportFilename("May 2020", "pdf")).toBe("PAD_Account_May_2020.pdf");
  });

  it("includes period bounds in the title", () => {
    expect(buildPadReportTitle("May 2020", "2020-05-01", "2020-05-31")).toContain("May 2020");
    expect(buildPadReportTitle("May 2020", "2020-05-01", "2020-05-31")).toContain("2020-05-01 to 2020-05-31");
  });

  it("formats month keys", () => {
    expect(formatReportMonth("2020-05")).toMatch(/May/i);
  });

  it("keeps eight sheet names", () => {
    expect(PAD_SHEET_NAMES).toHaveLength(8);
  });

  it("strips unsafe filename characters", () => {
    expect(sanitizeFilenamePart("FY 2025-26 | test")).toBe("FY_2025-26_test");
  });
});
