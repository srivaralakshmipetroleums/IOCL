import type { NextRequest } from "next/server";

function trimTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

/** Resolve the public app base URL for redirects and OAuth callbacks. */
export function getAppBaseUrl(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");

    if (host) {
      return trimTrailingSlash(`${proto}://${host}`);
    }

    return trimTrailingSlash(request.nextUrl.origin);
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

export function getGmailOAuthRedirectUri(request?: NextRequest): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  const derived = `${getAppBaseUrl(request)}/api/gmail/callback`;

  if (!configured) {
    return derived;
  }

  // Ignore localhost redirect URIs in production — common when env was copied from .env.example.
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(configured)) {
    return derived;
  }

  return configured;
}
