"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronDown, Clock } from "lucide-react";
import { IndianOilLogo } from "@/components/brand/IndianOilLogo";
import { useDashboardPeriod } from "@/components/layout/DashboardPeriodContext";
import { getCurrentMonthRange } from "@/lib/dashboard/filters";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const periodCtx = useDashboardPeriod();
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <IndianOilLogo size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight md:text-base">
              Indian Oil Corporation Limited
            </p>
            <p className="truncate text-xs text-white/80 md:text-sm">
              IOC Invoice Management &amp; Reporting System
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs md:gap-6 md:text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-ioc-orange" />
            <div>
              <p className="text-white/70">Period</p>
              <p className="font-semibold text-ioc-orange">{periodLabel}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
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
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/15"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ioc-orange text-xs font-bold">
                {userLabel.charAt(0)}
              </span>
              <span className="hidden md:inline">{userLabel}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>
      <div className="h-[3px] bg-ioc-orange" />
    </header>
  );
}
