"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  BarChart3,
  Settings,
  Mail,
  X,
} from "lucide-react";
import { IndianOilLogo } from "@/components/brand/IndianOilLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/upload", label: "Upload Invoices", icon: Upload },
  { href: "/gmail", label: "Gmail Invoices", icon: Mail, badge: "New" },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ioc-dark/50 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ioc-navy text-white transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 lg:hidden">
          <span className="font-semibold">Navigation</span>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-ioc-blue">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-ioc-orange text-white shadow-sm"
                    : "text-white/90 hover:bg-ioc-blue"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && !active && (
                  <span className="rounded-full bg-ioc-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/10 p-3">
            <IndianOilLogo size="sm" />
            <div>
              <p className="text-xs font-semibold">The Energy of India</p>
              <p className="text-[10px] text-white/70">IndianOil</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
