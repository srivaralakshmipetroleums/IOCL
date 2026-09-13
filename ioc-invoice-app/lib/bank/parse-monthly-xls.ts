import { readFileSync } from "fs";
import { parseBankGrid } from "@/lib/bank/parse-grid";
import type { ParsedBankStatement } from "@/lib/bank/types";

export function decodeSpreadsheetExportBuffer(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le");
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return buffer.subarray(2).swap16().toString("utf16le");
  }
  return buffer.toString("utf8");
}

export function parseBankMonthlyXlsFromBuffer(
  buffer: Buffer,
  sourceFilename: string
): ParsedBankStatement | null {
  const text = decodeSpreadsheetExportBuffer(buffer);
  const grid = text.split(/\r?\n/).map((line) => line.split("\t"));
  return parseBankGrid(grid, sourceFilename);
}

export function parseBankMonthlyXls(
  filePath: string,
  sourceFilename: string
): ParsedBankStatement | null {
  return parseBankMonthlyXlsFromBuffer(readFileSync(filePath), sourceFilename);
}
