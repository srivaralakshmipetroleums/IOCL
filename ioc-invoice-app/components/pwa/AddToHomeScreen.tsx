"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canShowInstallPrompt,
  isIosDevice,
  isStandalonePwa,
} from "@/lib/pwa/detect";

const DISMISSED_KEY = "ioc-pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AddToHomeScreenProps {
  /** login = below sign-in form; settings = always available in settings */
  placement?: "login" | "settings" | "app";
}

export function AddToHomeScreen({ placement = "app" }: AddToHomeScreenProps) {
  const [ready, setReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalonePwa());
    setIsIos(isIosDevice());
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    setReady(true);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!ready) return null;

  if (installed) {
    if (placement === "settings") {
      return (
        <p className="text-sm text-ioc-muted">
          This device is already using the installed app (home screen).
        </p>
      );
    }
    return null;
  }

  if (!canShowInstallPrompt()) {
    if (placement === "settings") {
      return (
        <p className="text-sm text-ioc-muted">
          Open Settings on your phone to add IOC Invoices to your home screen.
        </p>
      );
    }
    return null;
  }

  if (placement !== "settings" && dismissed) return null;
  if (!deferredPrompt && !isIos) {
    if (placement === "settings") {
      return (
        <p className="text-sm text-ioc-muted">
          Use Chrome on Android for one-tap install, or Safari on iPhone for Add to Home Screen.
        </p>
      );
    }
    return null;
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setDismissed(true);
        localStorage.setItem(DISMISSED_KEY, "true");
      }
      return;
    }

    if (isIos) {
      setShowIosHelp(true);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  const isLogin = placement === "login";
  const isSettings = placement === "settings";

  return (
    <>
      <div
        className={
          isSettings
            ? "space-y-3"
            : isLogin
              ? "mt-4 rounded-lg border border-white/50 bg-white/80 px-4 py-3 text-ioc-navy"
              : "rounded-lg border border-ioc-border bg-ioc-surface/60 px-4 py-3"
        }
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-ioc-orange-light p-2 text-ioc-navy">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ioc-navy">Add to Home Screen</p>
            <p className="mt-1 text-xs text-ioc-muted">
              Open like an app — no browser bar. Your login stays on this device until you sign out.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleInstall}>
                {deferredPrompt ? "Install app" : "How to install"}
              </Button>
              {placement === "app" && (
                <Button type="button" size="sm" variant="ghost" onClick={handleDismiss}>
                  Not now
                </Button>
              )}
            </div>
          </div>
          {placement === "app" && (
            <button
              type="button"
              onClick={handleDismiss}
              className="text-ioc-muted hover:text-ioc-navy"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showIosHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-ioc-navy">
              <Share className="h-5 w-5 text-ioc-orange" />
              <p className="font-semibold">Install on iPhone / iPad</p>
            </div>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-ioc-muted">
              <li>Tap the Share button in Safari (square with arrow).</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
            <Button className="mt-4 w-full" onClick={() => setShowIosHelp(false)}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
