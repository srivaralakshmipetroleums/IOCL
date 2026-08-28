import { describe, expect, it } from "vitest";
import {
  buildBatchPlan,
  buildFinancialYearBatchPlan,
  buildRetryPlanFromFailedJobs,
  buildSelectedMonthsBatchPlan,
  buildSingleJob,
  buildSingleJobPlan,
  describeBatchPlan,
  dsrRecordMatchesMonthYear,
  filterStoredRecordsForSelection,
  JAN_JUL_2026_BATCH_PLAN,
  monthYearOptionPatterns,
  monthYearDisplayMatches,
  monthYearShortDisplayValue,
  parseBatchCaptureRequest,
  parseBatchJobLabel,
  parseCaptureJobRequest,
  storedRecordMatchesSelection,
} from "@/lib/iras/dsr/batch-plan";

describe("buildBatchPlan", () => {
  it("builds Jan-Jul 2026 jobs for MS and HSD", () => {
    expect(JAN_JUL_2026_BATCH_PLAN.jobs).toHaveLength(14);
    expect(JAN_JUL_2026_BATCH_PLAN.jobs[0]).toEqual({
      year: 2026,
      month: 1,
      product: "MS",
      label: "Jan 2026 MS",
    });
    expect(JAN_JUL_2026_BATCH_PLAN.jobs.at(-1)).toEqual({
      year: 2026,
      month: 7,
      product: "HSD",
      label: "Jul 2026 HSD",
    });
  });

  it("creates month/year option patterns", () => {
    expect(monthYearOptionPatterns(1, 2026)).toContain("01-2026");
    expect(monthYearOptionPatterns(7, 2026)).toContain("Jul 2026");
  });

  it("matches short and full month display values", () => {
    expect(monthYearShortDisplayValue(3, 2026)).toBe("Mar 2026");
    expect(monthYearDisplayMatches("Mar 2026", 3, 2026)).toBe(true);
    expect(monthYearDisplayMatches("March 2026", 3, 2026)).toBe(true);
    expect(monthYearDisplayMatches("Jul 2026", 7, 2026)).toBe(true);
    expect(monthYearDisplayMatches("July 2026", 7, 2026)).toBe(true);
    expect(monthYearDisplayMatches("May 2026", 5, 2026)).toBe(true);
    expect(monthYearDisplayMatches("Apr 2026", 3, 2026)).toBe(false);
  });

  it("supports custom ranges", () => {
    const plan = buildBatchPlan({
      year: 2026,
      startMonth: 2,
      endMonth: 3,
      products: ["HSD"],
    });
    expect(plan.jobs).toEqual([
      { year: 2026, month: 2, product: "HSD", label: "Feb 2026 HSD" },
      { year: 2026, month: 3, product: "HSD", label: "Mar 2026 HSD" },
    ]);
  });

  it("builds a financial year batch plan across two calendar years", () => {
    const plan = buildFinancialYearBatchPlan(2025, ["MS", "HSD"]);
    expect(plan?.jobs).toHaveLength(24);
    expect(plan?.jobs[0]).toEqual({
      year: 2025,
      month: 4,
      product: "MS",
      label: "Apr 2025 MS",
    });
    expect(plan?.jobs.at(-1)).toEqual({
      year: 2026,
      month: 3,
      product: "HSD",
      label: "Mar 2026 HSD",
    });
  });

  it("builds a batch plan from selected month keys", () => {
    const plan = buildSelectedMonthsBatchPlan(["2026-01", "2026-03", "2026-07"], ["MS"]);
    expect(plan?.jobs).toEqual([
      { year: 2026, month: 1, product: "MS", label: "Jan 2026 MS" },
      { year: 2026, month: 3, product: "MS", label: "Mar 2026 MS" },
      { year: 2026, month: 7, product: "MS", label: "Jul 2026 MS" },
    ]);
  });

  it("parses batch capture requests", () => {
    const plan = parseBatchCaptureRequest({
      mode: "financialYear",
      products: ["MS", "HSD"],
      fyStartYear: 2025,
    });
    expect(plan?.jobs).toHaveLength(24);
    expect(describeBatchPlan(plan!)).toBe("12 months × MS + HSD (24 jobs)");
  });

  it("builds a retry plan from failed job messages", () => {
    expect(parseBatchJobLabel("Jan 2026 MS")).toEqual({
      year: 2026,
      month: 1,
      product: "MS",
      label: "Jan 2026 MS",
    });

    const retryPlan = buildRetryPlanFromFailedJobs([
      "Jan 2026 MS: DSR report request was not detected within 3 minutes.",
      "Apr 2026 HSD: IRAS session expired (401). Log in again in the Chromium window, then retry failed jobs.",
    ]);

    expect(retryPlan?.jobs).toEqual([
      { year: 2026, month: 1, product: "MS", label: "Jan 2026 MS" },
      { year: 2026, month: 4, product: "HSD", label: "Apr 2026 HSD" },
    ]);
  });

  it("builds a single-job capture plan", () => {
    const job = buildSingleJob({ month: 1, year: 2026, product: "MS" });
    expect(buildSingleJobPlan(job).jobs).toEqual([job]);
    expect(parseCaptureJobRequest({ month: 1, year: 2026, product: "MS" })).toEqual(job);
    expect(parseCaptureJobRequest({ month: 13, year: 2026, product: "MS" })).toBeNull();
  });

  it("matches stored DSR rows by month and year", () => {
    expect(dsrRecordMatchesMonthYear({ date_time: "15-01-2026" }, 1, 2026)).toBe(true);
    expect(dsrRecordMatchesMonthYear({ date_time: "15-02-2026" }, 1, 2026)).toBe(false);
  });

  it("matches stored DSR rows by product as well as month", () => {
    expect(
      storedRecordMatchesSelection(
        { product: "MS", record: { date_time: "15-01-2026" } },
        1,
        2026,
        "MS"
      )
    ).toBe(true);
    expect(
      storedRecordMatchesSelection(
        { product: "HSD", record: { date_time: "15-01-2026" } },
        1,
        2026,
        "MS"
      )
    ).toBe(false);
    expect(
      storedRecordMatchesSelection(
        { product: null, record: { date_time: "15-01-2026" } },
        1,
        2026,
        "MS"
      )
    ).toBe(false);
  });

  it("filters stored rows by month and product with legacy fallback", () => {
    const entries = [
      { product: "MS" as const, record: { date_time: "01-01-2026" } },
      { product: "HSD" as const, record: { date_time: "02-01-2026" } },
      { product: null, record: { date_time: "03-02-2026" } },
    ];

    expect(filterStoredRecordsForSelection(entries, 1, 2026, "MS")).toEqual({
      records: [{ date_time: "01-01-2026" }],
      usedLegacyUntagged: false,
    });

    expect(filterStoredRecordsForSelection(entries, 1, 2026, "HSD")).toEqual({
      records: [{ date_time: "02-01-2026" }],
      usedLegacyUntagged: false,
    });

    const legacyOnly = [{ product: null, record: { date_time: "15-01-2026" } }];
    expect(filterStoredRecordsForSelection(legacyOnly, 1, 2026, "MS")).toEqual({
      records: [{ date_time: "15-01-2026" }],
      usedLegacyUntagged: true,
    });
  });
});
