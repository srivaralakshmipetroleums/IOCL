import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getAppBaseUrl, getGmailOAuthRedirectUri } from "@/lib/app-url";

describe("app-url", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses NEXT_PUBLIC_APP_URL when configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ioc-app.vercel.app/";
    expect(getAppBaseUrl()).toBe("https://ioc-app.vercel.app");
  });

  it("derives base URL from request host on Vercel", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const request = new NextRequest("https://ioc-app.vercel.app/gmail", {
      headers: {
        host: "ioc-app.vercel.app",
        "x-forwarded-host": "ioc-app.vercel.app",
        "x-forwarded-proto": "https",
      },
    });

    expect(getAppBaseUrl(request)).toBe("https://ioc-app.vercel.app");
    expect(getGmailOAuthRedirectUri(request)).toBe("https://ioc-app.vercel.app/api/gmail/callback");
  });

  it("ignores localhost GOOGLE_REDIRECT_URI in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/gmail/callback";

    const request = new NextRequest("https://ioc-app.vercel.app/api/gmail/callback", {
      headers: {
        host: "ioc-app.vercel.app",
        "x-forwarded-host": "ioc-app.vercel.app",
        "x-forwarded-proto": "https",
      },
    });

    expect(getGmailOAuthRedirectUri(request)).toBe("https://ioc-app.vercel.app/api/gmail/callback");
  });
});
