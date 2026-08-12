"use client";

import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardPeriodProvider } from "@/components/layout/DashboardPeriodContext";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardPeriodProvider>
        <div className="flex min-h-screen flex-col bg-ioc-page">
          <AppHeader />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <AppSidebar />

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <main className="flex-1 overflow-x-hidden overflow-y-auto">
                <div className="mx-auto w-full max-w-[1400px] p-3 sm:p-4 md:p-6">{children}</div>
              </main>

              <AppFooter />
            </div>
          </div>
        </div>
      </DashboardPeriodProvider>
    </SidebarProvider>
  );
}
