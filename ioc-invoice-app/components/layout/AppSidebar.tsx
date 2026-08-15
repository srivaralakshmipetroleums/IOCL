"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  BarChart3,
  Settings,
  Mail,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { IndianOilLogo } from "@/components/brand/IndianOilLogo";
import { useSidebar } from "@/components/layout/SidebarContext";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/upload", label: "Upload Invoices", icon: Upload },
  { href: "/gmail", label: "Gmail Invoices", icon: Mail, badge: "New" },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileOpen, closeMobile, collapsed, toggleCollapsed } = useSidebar();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ioc-dark/60 backdrop-blur-[1px] md:hidden"
          onClick={closeMobile}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "relative z-50 flex shrink-0 flex-col bg-ioc-navy text-white transition-all duration-300 ease-in-out",
          "fixed inset-y-0 left-0 shadow-xl md:static md:shadow-none md:self-stretch",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Mobile close bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:hidden">
          <span className="text-sm font-semibold">Menu</span>
          <button
            type="button"
            onClick={closeMobile}
            className="rounded-md p-1.5 hover:bg-ioc-blue"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop collapse bar — always visible at top */}
        <div
          className={cn(
            "hidden shrink-0 items-center border-b border-white/10 md:flex",
            collapsed ? "justify-center px-2 py-3" : "justify-between gap-2 px-3 py-3"
          )}
        >
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Menu
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-sm font-medium text-white transition-colors hover:bg-ioc-blue"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2 md:p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={cn(
                  "group relative flex items-center rounded-lg text-sm font-medium transition-all",
                  collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-ioc-orange text-white shadow-sm"
                    : "text-white/90 hover:bg-ioc-blue"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && !active && (
                      <span className="rounded-full bg-ioc-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge && !active && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ioc-orange" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-white/10 p-2 md:p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center rounded-lg text-white/80 transition-colors hover:bg-ioc-blue hover:text-white md:hidden",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5 text-sm"
            )}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          <div
            className={cn(
              "items-center rounded-lg bg-white/10",
              collapsed ? "flex justify-center p-2" : "flex gap-3 p-3"
            )}
          >
            <IndianOilLogo size="sm" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">Sri Varalakshmi Petroleums</p>
                <p className="text-[10px] leading-snug text-white/70">
                  GuguduRoad, Narpala
                  <br />
                  Anantapur Dist-515425
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
