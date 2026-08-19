import { describe, it, expect } from "vitest";
import {
  buildGmailSearchQuery,
  buildGmailSearchQueryForRange,
  buildGmailAfterDate,
  buildGmailBeforeDate,
} from "@/lib/gmail/gmail-search";
import { getMonthChunksInDateRange } from "@/lib/invoices/period-utils";

const config = {
  sender: "B2BPRD@indianoil.in",
  subjects: ["AC4 Inv.-", "AC4 Invoice"],
  requireAttachment: true,
};

describe("gmail-search", () => {
  it("builds July 2026 query per spec", () => {
    const query = buildGmailSearchQuery(2026, 7, config);
    expect(query).toBe(
      'from:B2BPRD@indianoil.in {subject:"AC4 Inv.-" subject:"AC4 Invoice"} has:attachment after:2026/07/01 before:2026/08/01'
    );
  });

  it("builds December 2026 query crossing year boundary", () => {
    const query = buildGmailSearchQuery(2026, 12, config);
    expect(query).toBe(
      'from:B2BPRD@indianoil.in {subject:"AC4 Inv.-" subject:"AC4 Invoice"} has:attachment after:2026/12/01 before:2027/01/01'
    );
  });

  it("before date is first day of next month", () => {
    expect(buildGmailAfterDate(2026, 7)).toBe("2026/07/01");
    expect(buildGmailBeforeDate(2026, 7)).toBe("2026/08/01");
    expect(buildGmailBeforeDate(2026, 12)).toBe("2027/01/01");
  });

  it("builds custom date range query", () => {
    const query = buildGmailSearchQueryForRange("2026-01-15", "2026-03-20", config);
    expect(query).toBe(
      'from:B2BPRD@indianoil.in {subject:"AC4 Inv.-" subject:"AC4 Invoice"} has:attachment after:2026/01/15 before:2026/03/21'
    );
  });

  it("uses a single subject pattern when only one is configured", () => {
    const query = buildGmailSearchQuery(2023, 1, {
      sender: "B2BPRD@indianoil.in",
      subjects: ["AC4 Invoice"],
      requireAttachment: true,
    });
    expect(query).toBe(
      'from:B2BPRD@indianoil.in subject:"AC4 Invoice" has:attachment after:2023/01/01 before:2023/02/01'
    );
  });

  it("splits multi-month ranges into chunks", () => {
    const chunks = getMonthChunksInDateRange("2026-01-15", "2026-03-20");
    expect(chunks).toEqual([
      { dateFrom: "2026-01-15", dateToInclusive: "2026-01-31", label: "2026-01-15 to 2026-01-31" },
      { dateFrom: "2026-02-01", dateToInclusive: "2026-02-28", label: "2026-02-01 to 2026-02-28" },
      { dateFrom: "2026-03-01", dateToInclusive: "2026-03-20", label: "2026-03-01 to 2026-03-20" },
    ]);
  });
});
