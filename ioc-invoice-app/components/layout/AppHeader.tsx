"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronDown, Clock, Menu } from "lucide-react";
import { IndianOilLogo } from "@/components/brand/IndianOilLogo";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { useSidebar } from "@/components/layout/SidebarContext";
import { getCurrentMonthRange } from "@/lib/dashboard/filters";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  const periodCtx = useDashboardPeriod();
  const { openMobile } = useSidebar();
  const periodLabel = periodCtx?.periodLabel ?? getCurrentMonthRange().monthLabel;
  const [userLabel, setUserLabel] = useState("User");
  const [menuOpen, setMenuOpen] = useState(false);

  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email;
      if (email) {
        const name = email.split("@")[0].replace(/[._]/g, " ");
        setUserLabel(name.charAt(0).toUpperCase() + name.slice(1));
      }
    });
  }, []);

  return (
    <header className="ioc-header-gradient relative shrink-0 text-white shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3 md:px-6 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={openMobile}
            className="shrink-0 text-white hover:bg-white/10 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <IndianOilLogo size="lg" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight sm:text-sm md:text-base">
              Sri Varalakshmi Petroleums
            </p>
            <p className="hidden truncate text-xs text-white/80 sm:block md:text-sm">
              IOC Invoice Management &amp; Reporting System
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs sm:w-auto sm:justify-end sm:gap-4 md:gap-6 md:text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-ioc-orange" />
            <div>
              <p className="text-[10px] text-white/70 sm:text-xs">Period</p>
              <p className="text-xs font-semibold text-ioc-orange sm:text-sm">{periodLabel}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Clock className="h-4 w-4 text-white/70" />
            <div>
              <p className="text-white/70">Generated on</p>
              <p className="font-medium">{generatedAt}</p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-sm font-medium transition-colors hover:bg-white/15 sm:px-3"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ioc-orange text-xs font-bold">
                {userLabel.charAt(0)}
              </span>
              <span className="hidden max-w-[100px] truncate sm:inline md:max-w-none">{userLabel}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-ioc-orange" />
    </header>
  );
}
