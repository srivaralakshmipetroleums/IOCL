"use client";

import { Select } from "@/components/ui/select";

export type DashboardViewMode = "invoice" | "overview";

interface DashboardViewSelectorProps {
  value: DashboardViewMode;
  onChange: (value: DashboardViewMode) => void;
  disabled?: boolean;
}

export function DashboardViewSelector({ value, onChange, disabled }: DashboardViewSelectorProps) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor="dashboard-view" className="text-sm font-medium text-ioc-navy">
        View
      </label>
      <Select
        id="dashboard-view"
        value={value}
        onChange={(e) => onChange(e.target.value as DashboardViewMode)}
        disabled={disabled}
      >
        <option value="invoice">Invoice Dashboard</option>
        <option value="overview">Business Overview</option>
      </Select>
      <p className="text-xs text-ioc-muted">
        {value === "invoice"
          ? "Operational charts, line items, and invoice detail."
          : "Executive analytics, month comparisons, price trends, and FY insights."}
      </p>
    </div>
  );
}
