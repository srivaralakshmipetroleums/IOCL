"use client";

export type DashboardViewMode = "invoice" | "overview";

interface DashboardViewSelectorProps {
  value: DashboardViewMode;
  onChange: (value: DashboardViewMode) => void;
  disabled?: boolean;
}

export function DashboardViewSelector({ value, onChange, disabled }: DashboardViewSelectorProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="dashboard-view" className="text-sm font-medium text-ioc-navy">
        View
      </label>
      <select
        id="dashboard-view"
        value={value}
        onChange={(e) => onChange(e.target.value as DashboardViewMode)}
        disabled={disabled}
        className="h-10 w-full rounded-[10px] border border-ioc-border bg-white px-3 text-sm outline-none focus:border-ioc-blue sm:min-w-[220px]"
      >
        <option value="invoice">Invoice Dashboard</option>
        <option value="overview">Business Overview</option>
      </select>
      <p className="text-xs text-ioc-muted">
        {value === "invoice"
          ? "Operational charts, line items, and invoice detail."
          : "Executive analytics, month comparisons, price trends, and FY insights."}
      </p>
    </div>
  );
}
