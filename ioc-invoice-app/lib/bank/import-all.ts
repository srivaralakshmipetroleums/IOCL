import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { importBankStatement } from "@/lib/bank/bank-repository";
import {
  consolidatedBankDir,
  listConsolidatedBankFiles,
  listMonthlyBankFiles,
  listPdfBankFiles,
} from "@/lib/bank/files";
import { parseBankConsolidatedWorkbook } from "@/lib/bank/parse-consolidated-xlsx";
import { parseBankMonthlyXls } from "@/lib/bank/parse-monthly-xls";
import { parseBankStatementPdf } from "@/lib/bank/parse-pdf";

export interface BankImportResult {
  filename: string;
  sheet: string;
  fyLabel: string;
  transactionCount: number;
  skipped?: string;
}

export async function importAllBankStatements(
  supabase: SupabaseClient
): Promise<BankImportResult[]> {
  const results: BankImportResult[] = [];
  const dir = consolidatedBankDir();

  for (const filename of listConsolidatedBankFiles(dir)) {
    const statements = await parseBankConsolidatedWorkbook(path.join(dir, filename), filename);
    for (const parsed of statements) {
      const result = await importBankStatement(supabase, parsed, filename);
      results.push({
        filename,
        sheet: parsed.sourceSheet,
        fyLabel: parsed.fyLabel,
        transactionCount: result.transactionCount,
      });
    }
  }

  for (const file of listMonthlyBankFiles()) {
    const parsed = parseBankMonthlyXls(file.filePath, file.filename);
    if (!parsed) {
      results.push({
        filename: file.filename,
        sheet: file.filename,
        fyLabel: "",
        transactionCount: 0,
        skipped: "No transactions (empty or failed SBI export)",
      });
      continue;
    }

    const result = await importBankStatement(supabase, parsed, file.filename);
    results.push({
      filename: file.filename,
      sheet: parsed.sourceSheet,
      fyLabel: parsed.fyLabel,
      transactionCount: result.transactionCount,
    });
  }

  for (const file of listPdfBankFiles()) {
    const parsed = await parseBankStatementPdf(file.filePath, file.filename);
    if (!parsed) {
      results.push({
        filename: file.filename,
        sheet: file.filename,
        fyLabel: "",
        transactionCount: 0,
        skipped: "No transactions found in PDF",
      });
      continue;
    }

    const result = await importBankStatement(supabase, parsed, file.filename);
    results.push({
      filename: file.filename,
      sheet: parsed.sourceSheet,
      fyLabel: parsed.fyLabel,
      transactionCount: result.transactionCount,
    });
  }

  return results;
}
