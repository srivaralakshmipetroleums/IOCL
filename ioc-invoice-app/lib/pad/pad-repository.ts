import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedPadStatement } from "@/lib/pad/parse-pad-statement";

export async function importPadStatement(
  supabase: SupabaseClient,
  parsed: ParsedPadStatement,
  sourceFilename: string
): Promise<{ statementId: string; transactionCount: number }> {
  if (!parsed.periodFrom || !parsed.periodTo) {
    throw new Error(`Missing period dates in ${sourceFilename}`);
  }

  const statementPayload = {
    fy_label: parsed.fyLabel,
    period_from: parsed.periodFrom,
    period_to: parsed.periodTo,
    customer_name: parsed.customerName,
    customer_code: parsed.customerCode,
    controlling_office: parsed.controllingOffice,
    report_generated_at: parsed.reportGeneratedAt,
    opening_balance: parsed.openingBalance,
    closing_balance: parsed.closingBalance,
    open_delivery_value: parsed.openDeliveryValue,
    source_filename: sourceFilename,
    imported_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("pad_statements")
    .select("id")
    .eq("period_from", parsed.periodFrom)
    .eq("period_to", parsed.periodTo)
    .eq("customer_code", parsed.customerCode ?? "")
    .maybeSingle();

  let statementId = existing?.id as string | undefined;

  if (statementId) {
    const { error: updateError } = await supabase
      .from("pad_statements")
      .update(statementPayload)
      .eq("id", statementId);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from("pad_transactions")
      .delete()
      .eq("statement_id", statementId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from("pad_statements")
      .insert(statementPayload)
      .select("id")
      .single();
    if (error) throw error;
    statementId = data.id;
  }

  if (!statementId) {
    throw new Error(`Failed to upsert PAD statement for ${sourceFilename}`);
  }

  if (!parsed.transactions.length) {
    return { statementId, transactionCount: 0 };
  }

  const rows = parsed.transactions.map((row) => ({
    statement_id: statementId,
    line_number: row.lineNumber,
    plant: row.plant,
    item_text: row.itemText,
    document_type: row.documentType,
    document_number: row.documentNumber,
    transaction_date: row.transactionDate,
    material_group: row.materialGroup,
    quantity: row.quantity,
    unit: row.unit,
    debit: row.debit,
    credit: row.credit,
    balance: row.balance,
    category: row.category,
  }));

  const { error: insertError } = await supabase.from("pad_transactions").insert(rows);
  if (insertError) throw insertError;

  return { statementId, transactionCount: rows.length };
}
