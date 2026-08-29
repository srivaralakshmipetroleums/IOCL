"use client";

import { useEffect, useState } from "react";
import { BrandedLogo } from "@/components/brand/BrandedLogo";
import { isMobileDevice, isStandalonePwa } from "@/lib/pwa/detect";
import { cn } from "@/lib/utils";

const SPLASH_MIN_MS = 900;
const SPLASH_FADE_MS = 320;

type SplashPhase = "visible" | "fading" | "hidden";

export function BrandedSplash() {
  const [phase, setPhase] = useState<SplashPhase>("visible");

  useEffect(() => {
    const shouldShow = isMobileDevice() || isStandalonePwa();
    if (!shouldShow) {
      setPhase("hidden");
      return;
    }

    const startedAt = Date.now();
    let fadeTimer: number | undefined;
    let hideTimer: number | undefined;

    function hideSplash() {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, SPLASH_MIN_MS - elapsed);

      fadeTimer = window.setTimeout(() => {
        setPhase("fading");
        hideTimer = window.setTimeout(() => setPhase("hidden"), SPLASH_FADE_MS);
      }, wait);
    }

    if (document.readyState === "complete") {
      hideSplash();
    } else {
      window.addEventListener("load", hideSplash, { once: true });
    }

    return () => {
      window.removeEventListener("load", hideSplash);
      if (fadeTimer != null) window.clearTimeout(fadeTimer);
      if (hideTimer != null) window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ioc-page transition-opacity duration-300 md:hidden",
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-hidden={phase === "fading"}
      role="status"
    >
      <BrandedLogo size="xl" animated priority />
      <p className="mt-4 text-sm font-medium text-ioc-navy">Sri Varalakshmi Petroleums</p>
      <p className="mt-1 text-xs text-ioc-muted">IOC Invoice Management</p>
    </div>
  );
}
