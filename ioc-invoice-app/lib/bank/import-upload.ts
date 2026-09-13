import type { SupabaseClient } from "@supabase/supabase-js";
import { importBankStatement } from "@/lib/bank/bank-repository";
import { parseBankUpload } from "@/lib/bank/parse-upload";
import type { BankImportResult } from "@/lib/bank/import-all";

export async function importBankUpload(
  supabase: SupabaseClient,
  buffer: Buffer,
  filename: string
): Promise<BankImportResult[]> {
  const { statements, skipped } = await parseBankUpload(buffer, filename);

  if (skipped) {
    return [
      {
        filename,
        sheet: filename,
        fyLabel: "",
        transactionCount: 0,
        skipped,
      },
    ];
  }

  const results: BankImportResult[] = [];
  for (const parsed of statements) {
    const result = await importBankStatement(supabase, parsed, filename);
    results.push({
      filename,
      sheet: parsed.sourceSheet,
      fyLabel: parsed.fyLabel,
      transactionCount: result.transactionCount,
    });
  }

  return results;
}
