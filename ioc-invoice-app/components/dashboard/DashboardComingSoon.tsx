"use client";

import Link from "next/link";
import { ChefHat, LayoutDashboard, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";

export function DashboardComingSoon() {
  return (
    <div className="space-y-6">
      <PageTitle>Dashboard</PageTitle>

      <div className="relative overflow-hidden rounded-2xl border border-ioc-border bg-white p-8 shadow-sm md:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ioc-orange/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-ioc-blue/10" />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-ioc-navy to-ioc-blue text-white shadow-lg">
            <ChefHat className="h-10 w-10" />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-ioc-orange-light px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-ioc-navy">
            <Sparkles className="h-3.5 w-3.5 text-ioc-orange" />
            Something big is cooking
          </div>

          <h2 className="text-2xl font-bold text-ioc-navy md:text-3xl">
            Unified business dashboard is under construction
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-ioc-muted md:text-base">
            We&apos;re building a bigger picture — one place to see fuel, finance, bank, and
            operations together. Invoice analytics and business overview are already live in the
            meantime.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/invoice">
                <LayoutDashboard className="h-4 w-4" />
                Open Invoice module
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-ioc-muted">
            Bank, Account, and Reports modules are available from the sidebar.
          </p>
        </div>
      </div>
    </div>
  );
}
