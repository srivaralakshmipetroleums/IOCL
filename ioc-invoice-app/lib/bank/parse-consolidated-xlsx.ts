import type { Worksheet, CellValue } from "exceljs";
import { Workbook } from "exceljs";
import { dedupeStatements, parseBankGrid } from "@/lib/bank/parse-grid";
import type { ParsedBankStatement } from "@/lib/bank/types";

export {
  fyLabelFromDate,
  normalizeAccountNumber,
  toIsoDate,
} from "@/lib/bank/parse-values";

function unwrapCell(value: CellValue): unknown {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    const obj = value as unknown as Record<string, unknown>;
    if (obj.result !== undefined) return unwrapCell(obj.result as CellValue);
    if (typeof obj.text === "string") return obj.text;
    if (Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: string }>).map((part) => part.text ?? "").join("");
    }
  }
  return value;
}

function cellText(value: CellValue): string {
  const unwrapped = unwrapCell(value);
  if (unwrapped instanceof Date) return unwrapped.toISOString();
  return String(unwrapped ?? "").trim();
}

function sheetToGrid(ws: Worksheet): string[][] {
  const grid: string[][] = [];
  ws.eachRow((row, rowNumber) => {
    const values: string[] = [];
    for (let col = 1; col <= 8; col++) {
      values[col - 1] = cellText(row.getCell(col).value);
    }
    grid[rowNumber - 1] = values;
  });
  return grid;
}

export async function parseBankConsolidatedWorkbook(
  filePath: string,
  sourceFilename: string
): Promise<ParsedBankStatement[]> {
  const workbook = new Workbook();
  await workbook.xlsx.readFile(filePath);
  const statements: ParsedBankStatement[] = [];

  for (const sheet of workbook.worksheets) {
    const parsed = parseBankGrid(sheetToGrid(sheet), sheet.name);
    if (parsed) statements.push(parsed);
  }

  if (!statements.length) {
    throw new Error(`No monthly statements found in ${sourceFilename}`);
  }

  return dedupeStatements(statements);
}
