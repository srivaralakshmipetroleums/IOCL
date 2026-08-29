"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Supabase session alive on mobile/PWA: refreshes when the app returns
 * to the foreground and listens for token refresh events.
 */
export function AuthSessionKeeper() {
  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getSession();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void supabase.auth.getSession();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        void supabase.auth.getSession();
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
