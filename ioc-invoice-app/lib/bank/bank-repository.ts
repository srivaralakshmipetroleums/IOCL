import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedBankStatement } from "@/lib/bank/types";

const INSERT_CHUNK = 500;

export async function importBankStatement(
  supabase: SupabaseClient,
  parsed: ParsedBankStatement,
  sourceFilename: string
): Promise<{ statementId: string; transactionCount: number }> {
  const statementPayload = {
    fy_label: parsed.fyLabel,
    period_from: parsed.periodFrom,
    period_to: parsed.periodTo,
    account_name: parsed.accountName,
    account_number: parsed.accountNumber,
    account_description: parsed.accountDescription,
    branch: parsed.branch,
    ifsc: parsed.ifsc,
    opening_balance: parsed.openingBalance,
    closing_balance: parsed.closingBalance,
    source_filename: sourceFilename,
    source_sheet: parsed.sourceSheet,
    imported_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("bank_statements")
    .select("id")
    .eq("account_number", parsed.accountNumber)
    .eq("period_from", parsed.periodFrom)
    .eq("period_to", parsed.periodTo)
    .maybeSingle();

  let statementId = existing?.id as string | undefined;

  if (statementId) {
    const { error: updateError } = await supabase
      .from("bank_statements")
      .update(statementPayload)
      .eq("id", statementId);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from("bank_transactions")
      .delete()
      .eq("statement_id", statementId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from("bank_statements")
      .insert(statementPayload)
      .select("id")
      .single();
    if (error) throw error;
    statementId = data.id;
  }

  if (!statementId) {
    throw new Error(`Failed to upsert bank statement ${sourceFilename} / ${parsed.sourceSheet}`);
  }

  const rows = parsed.transactions.map((row) => ({
    statement_id: statementId,
    line_number: row.lineNumber,
    txn_date: row.txnDate,
    value_date: row.valueDate,
    description: row.description,
    reference_no: row.referenceNo,
    branch_code: row.branchCode,
    debit: row.debit,
    credit: row.credit,
    balance: row.balance,
    category: row.category,
  }));

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error: insertError } = await supabase.from("bank_transactions").insert(chunk);
    if (insertError) throw insertError;
  }

  return { statementId, transactionCount: rows.length };
}
