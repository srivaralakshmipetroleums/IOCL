import { describe, it, expect } from "vitest";
import { buildGmailSearchQuery, buildGmailAfterDate, buildGmailBeforeDate } from "@/lib/gmail/gmail-search";

const config = {
  sender: "B2BPRD@indianoil.in",
  subject: "AC4 Inv.-",
  requireAttachment: true,
};

describe("gmail-search", () => {
  it("builds July 2026 query per spec", () => {
    const query = buildGmailSearchQuery(2026, 7, config);
    expect(query).toBe(
      'from:B2BPRD@indianoil.in subject:"AC4 Inv.-" has:attachment after:2026/07/01 before:2026/08/01'
    );
  });

  it("builds December 2026 query crossing year boundary", () => {
    const query = buildGmailSearchQuery(2026, 12, config);
    expect(query).toBe(
      'from:B2BPRD@indianoil.in subject:"AC4 Inv.-" has:attachment after:2026/12/01 before:2027/01/01'
    );
  });

  it("before date is first day of next month", () => {
    expect(buildGmailAfterDate(2026, 7)).toBe("2026/07/01");
    expect(buildGmailBeforeDate(2026, 7)).toBe("2026/08/01");
    expect(buildGmailBeforeDate(2026, 12)).toBe("2027/01/01");
  });
});
