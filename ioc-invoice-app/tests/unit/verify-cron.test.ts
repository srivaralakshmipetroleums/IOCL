import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron";

describe("verifyCronRequest", () => {
  it("accepts Authorization Bearer token", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new NextRequest("http://localhost/api/cron/gmail-weekly", {
      headers: { authorization: "Bearer test-secret" },
    });
    expect(verifyCronRequest(request)).toBe(true);
  });

  it("accepts x-cron-secret header", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new NextRequest("http://localhost/api/cron/gmail-weekly", {
      headers: { "x-cron-secret": "test-secret" },
    });
    expect(verifyCronRequest(request)).toBe(true);
  });

  it("rejects missing or wrong secret", () => {
    process.env.CRON_SECRET = "test-secret";
    const request = new NextRequest("http://localhost/api/cron/gmail-weekly");
    expect(verifyCronRequest(request)).toBe(false);
  });
});
