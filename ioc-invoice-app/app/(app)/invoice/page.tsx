"use client";

import { useState } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import type { DashboardViewMode } from "@/components/dashboard/DashboardViewSelector";

export default function InvoiceModulePage() {
  const [view, setView] = useState<DashboardViewMode>("invoice");

  return <DashboardPage view={view} onViewChange={setView} />;
}
