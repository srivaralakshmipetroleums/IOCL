import { parseBankConsolidatedWorkbookFromBuffer } from "@/lib/bank/parse-consolidated-xlsx";
import { parseBankMonthlyXlsFromBuffer } from "@/lib/bank/parse-monthly-xls";
import { parseBankStatementPdfFromBuffer } from "@/lib/bank/parse-pdf";
import type { ParsedBankStatement } from "@/lib/bank/types";

export interface BankUploadParseResult {
  statements: ParsedBankStatement[];
  skipped?: string;
}

export async function parseBankUpload(
  buffer: Buffer,
  filename: string
): Promise<BankUploadParseResult> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const parsed = await parseBankStatementPdfFromBuffer(buffer, filename);
    if (!parsed) {
      return { statements: [], skipped: "No transactions found in PDF" };
    }
    return { statements: [parsed] };
  }

  if (lower.endsWith(".xlsx")) {
    const statements = await parseBankConsolidatedWorkbookFromBuffer(buffer, filename);
    return { statements };
  }

  if (lower.endsWith(".xls")) {
    const parsed = parseBankMonthlyXlsFromBuffer(buffer, filename);
    if (!parsed) {
      return { statements: [], skipped: "No transactions (empty or failed SBI export)" };
    }
    return { statements: [parsed] };
  }

  throw new Error("Unsupported file type. Upload .xlsx, .xls, or .pdf");
}
