import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardFilters } from "@/lib/dashboard/filters";
import { summarizeDayClosing, type DayCloseSummaryRow } from "@/lib/day-close/stored-to-compute";
import { listDayClosingsInRange } from "@/lib/day-close/repository";
import { loadBusinessDashboard } from "@/lib/stock/load-business-dashboard";
import { loadPadReportDataset, type PadReportPeriod } from "@/lib/reports/load-pad-report";
import { loadBankReportDataset } from "@/lib/reports/load-bank-report";
import type { PadReconciliationRow } from "@/lib/pad/reconciliation";
import type { BankPadReconciliationRow } from "@/lib/bank/reconcile-pad-iocl";
import type { BusinessDashboardPayload } from "@/lib/stock/types";
import type { PadReportDataset } from "@/lib/reports/load-pad-report";
import type { BankReportDataset } from "@/lib/reports/load-bank-report";

export interface OwnerPackPeriod {
  dateFrom: string;
  dateTo: string;
  label: string;
  months?: string[];
}

export interface ReconciliationExceptionRow {
  source: "PAD vs Invoice" | "Bank vs PAD IOCL";
  date: string | null;
  reference: string;
  status: string;
  amount: number | null;
  details: string;
}

export interface OwnerPackDataset {
  period: OwnerPackPeriod;
  generatedAt: string;
  business: BusinessDashboardPayload;
  pad: PadReportDataset;
  bank: BankReportDataset;
  dayCloseSummaries: DayCloseSummaryRow[];
  reconciliationExceptions: ReconciliationExceptionRow[];
}

function padReconToException(row: PadReconciliationRow): ReconciliationExceptionRow {
  return {
    source: "PAD vs Invoice",
    date: row.padDate ?? row.invoiceDate,
    reference: row.billingDoc ?? row.invoiceNumber ?? row.padTransactionId,
    status: row.status,
    amount: row.padDebit || row.invoiceTotal,
    details: row.mismatchReason ?? "",
  };
}

function bankReconToException(row: BankPadReconciliationRow): ReconciliationExceptionRow {
  return {
    source: "Bank vs PAD IOCL",
    date: row.bankDate ?? row.padDate,
    reference: row.bankRef ?? row.padRef ?? row.utr ?? "",
    status: row.status,
    amount: row.bankAmount ?? row.padAmount,
    details: row.note ?? "",
  };
}

export async function loadOwnerPackDataset(
  supabase: SupabaseClient,
  period: OwnerPackPeriod
): Promise<OwnerPackDataset> {
  const filters: DashboardFilters = {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    months: period.months,
  };

  const [business, pad, bank, dayClosings] = await Promise.all([
    loadBusinessDashboard(supabase, filters),
    loadPadReportDataset(period),
    loadBankReportDataset(period),
    listDayClosingsInRange(supabase, period.dateFrom, period.dateTo),
  ]);

  const dayCloseSummaries = dayClosings.map(summarizeDayClosing);
  const reconciliationExceptions = [
    ...pad.reconciliation
      .filter((row) => row.status !== "MATCHED")
      .map(padReconToException),
    ...bank.reconciliation
      .filter((row) => row.status !== "MATCHED")
      .map(bankReconToException),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return {
    period,
    generatedAt: new Date().toISOString(),
    business,
    pad,
    bank,
    dayCloseSummaries,
    reconciliationExceptions,
  };
}
