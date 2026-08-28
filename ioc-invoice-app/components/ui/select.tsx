import * as React from "react";
import { cn } from "@/lib/utils";

export const selectClassName =
  "flex h-10 w-full min-w-0 max-w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm text-ioc-text outline-none focus:border-ioc-blue focus-visible:ring-2 focus-visible:ring-ioc-blue focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(selectClassName, className)} {...props} />
  )
);
Select.displayName = "Select";

export { Select };
