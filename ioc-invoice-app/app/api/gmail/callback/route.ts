import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppBaseUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/gmail/gmail-service";
import { gmailConnectionRepository } from "@/lib/gmail/gmail-connection-repository";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  const baseUrl = getAppBaseUrl(request);

  if (error) {
    return NextResponse.redirect(`${baseUrl}/gmail?error=${encodeURIComponent(error)}`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gmail_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${baseUrl}/gmail?error=invalid_state`);
  }

  cookieStore.delete("gmail_oauth_state");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, request);
    await gmailConnectionRepository.upsert({
      user_id: user.id,
      ...tokens,
    });

    return NextResponse.redirect(`${baseUrl}/gmail?connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(`${baseUrl}/gmail?error=${encodeURIComponent(message)}`);
  }
}
