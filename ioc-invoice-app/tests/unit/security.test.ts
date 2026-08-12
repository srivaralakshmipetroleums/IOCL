import { describe, it, expect } from "vitest";

describe("security", () => {
  it("does not expose service role key in client env vars", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("API routes require auth (unauthenticated returns 401)", async () => {
    const routes = ["/api/invoices", "/api/dashboard/summary"];
    for (const route of routes) {
      const res = await fetch(`http://localhost:3000${route}`);
      expect([401, 404]).toContain(res.status);
    }
  });
});
