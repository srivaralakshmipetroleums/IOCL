"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardPeriodProvider } from "@/components/layout/DashboardPeriodContext";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DashboardPeriodProvider>
      <div className="flex min-h-screen flex-col bg-ioc-page">
        <AppHeader />

        <div className="flex min-h-0 flex-1">
          <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-ioc-border bg-white px-4 py-2 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5 text-ioc-navy" />
              </Button>
              <span className="text-sm font-medium capitalize text-ioc-navy">
                {pathname.split("/")[1] || "dashboard"}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-4 w-4 text-ioc-navy" />
              </Button>
            </div>

            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1400px] p-4 md:p-6">{children}</div>
            </main>

            <AppFooter />
          </div>
        </div>
      </div>
    </DashboardPeriodProvider>
  );
}
