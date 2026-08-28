"use client";

import { cn } from "@/lib/utils";

export interface HubTab {
  id: string;
  label: string;
}

interface HubTabBarProps {
  tabs: HubTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function HubTabBar({ tabs, active, onChange, className }: HubTabBarProps) {
  return (
    <div className={cn("overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]", className)}>
      <div
        className="flex w-max min-w-full flex-nowrap gap-1 rounded-[10px] border border-ioc-border bg-ioc-surface/40 p-1"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              active === tab.id
                ? "bg-white text-ioc-navy shadow-sm"
                : "text-ioc-muted hover:text-ioc-navy"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
