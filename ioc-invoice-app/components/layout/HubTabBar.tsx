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
  function select(id: string) {
    if (id === active) return;
    onChange(id);
  }

  return (
    <div
      role="tablist"
      className={cn(
        "grid w-full gap-1 rounded-[10px] border border-ioc-border bg-ioc-surface/40 p-1",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              if (event.pointerType === "touch" || event.pointerType === "pen") {
                event.preventDefault();
                select(tab.id);
              }
            }}
            onClick={() => select(tab.id)}
            className={cn(
              "min-h-11 touch-manipulation select-none rounded-lg px-1.5 py-2 text-center text-xs font-semibold leading-tight sm:min-h-10 sm:px-3 sm:text-sm",
              "[-webkit-tap-highlight-color:transparent]",
              isActive
                ? "bg-white text-ioc-navy shadow-sm"
                : "text-ioc-muted active:bg-white/80 active:text-ioc-navy"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
