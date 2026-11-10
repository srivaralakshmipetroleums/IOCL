import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function hasSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key && !url.includes("your-project"));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasSupabasePublicEnv()) {
    return new NextResponse(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy ioc-invoice-app/.env.example to ioc-invoice-app/.env.local and paste the keys from https://supabase.com/dashboard/project/qvrfonbultntaajayzxh/settings/api then restart npm run dev.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: typeof options?.path === "string" ? options.path : "/",
              sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
              secure: process.env.NODE_ENV === "production",
            });
          });
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
