/**
 * Match bank IOCL_PAYMENT debits with PAD non-fleet PAYMENT credits for a date range.
 * Usage: npx tsx scripts/reconcile-bank-pad-iocl.ts [dateFrom] [dateTo]
 */
import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  bankRowsForPadReconciliation,
  padRowsForBankReconciliation,
  reconcileBankPadIocl,
  summarizeBankPadReconciliation,
} from "../lib/bank/reconcile-pad-iocl";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function inr(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function main() {
  loadEnvFile();
  const dateFrom = process.argv[2] ?? "2026-03-01";
  const dateTo = process.argv[3] ?? "2026-03-31";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const supabase = createClient(url, key);

  const { data: bankData, error: bankErr } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("category", "IOCL_PAYMENT")
    .gte("txn_date", dateFrom)
    .lte("txn_date", dateTo)
    .order("txn_date")
    .order("line_number");
  if (bankErr) throw bankErr;

  const { data: padData, error: padErr } = await supabase
    .from("pad_transactions")
    .select("*")
    .eq("category", "PAYMENT")
    .gte("transaction_date", dateFrom)
    .lte("transaction_date", dateTo)
    .order("transaction_date")
    .order("line_number");
  if (padErr) throw padErr;

  const bankRows = bankRowsForPadReconciliation(
    (bankData ?? []).map((row) => ({
      ...row,
      id: String(row.id),
      statement_id: String(row.statement_id),
      txn_date: String(row.txn_date),
      debit: Number(row.debit),
      credit: Number(row.credit),
      balance: row.balance != null ? Number(row.balance) : null,
      description: String(row.description ?? ""),
      reference_no: (row.reference_no as string) ?? null,
      branch_code: (row.branch_code as string) ?? null,
      value_date: (row.value_date as string) ?? null,
      line_number: Number(row.line_number),
      category: row.category,
    }))
  );
  const padRows = padRowsForBankReconciliation(
    (padData ?? []).map((row) => ({
      ...row,
      id: String(row.id),
      statement_id: String(row.statement_id),
      item_text: String(row.item_text ?? ""),
      document_type: (row.document_type as string) ?? null,
      document_number: (row.document_number as string) ?? null,
      transaction_date: (row.transaction_date as string) ?? null,
      debit: Number(row.debit),
      credit: Number(row.credit),
      balance: row.balance != null ? Number(row.balance) : null,
      line_number: Number(row.line_number),
      category: row.category,
      plant: (row.plant as string) ?? null,
      material_group: (row.material_group as string) ?? null,
      quantity: row.quantity != null ? Number(row.quantity) : null,
      unit: (row.unit as string) ?? null,
    }))
  );

  const rows = reconcileBankPadIocl(bankRows, padRows);
  const summary = summarizeBankPadReconciliation(
    rows,
    bankRows.reduce((sum, row) => sum + row.amount, 0),
    padRows.reduce((sum, row) => sum + row.amount, 0)
  );

  console.log(`\nBank ↔ PAD IOCL reconciliation: ${dateFrom} to ${dateTo}\n`);
  console.log(`Bank IOCL payments:  ${bankRows.length} txns  ${inr(summary.bankTotal)}`);
  console.log(`PAD SBI deposits:    ${padRows.length} txns  ${inr(summary.padTotal)}`);
  console.log(`Difference:          ${inr(summary.bankTotal - summary.padTotal)}\n`);
  console.log(
    `Matched: ${summary.matched}  |  Amount mismatch: ${summary.amountMismatch}  |  Bank only: ${summary.bankOnly}  |  PAD only: ${summary.padOnly}\n`
  );

  for (const row of rows.filter((r) => r.status !== "MATCHED")) {
    console.log(`${row.status}  bank=${row.bankDate} ${inr(row.bankAmount ?? 0)}  pad=${row.padDate} ${inr(row.padAmount ?? 0)}`);
    if (row.note) console.log(`  ${row.note}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
