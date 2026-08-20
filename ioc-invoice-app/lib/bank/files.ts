import { readdirSync } from "fs";
import path from "path";

export function bankStatementsRoot(): string {
  return path.resolve(process.cwd(), "..", "Docs", "BANK STMNTS");
}

export function consolidatedBankDir(): string {
  return path.join(bankStatementsRoot(), "Consolidated");
}

export function listConsolidatedBankFiles(dir = consolidatedBankDir()): string[] {
  return readdirSync(dir)
    .filter((name) => /\.xlsx$/i.test(name) && !name.startsWith("~$"))
    .sort();
}

export interface MonthlyBankFile {
  yearDir: string;
  filename: string;
  filePath: string;
}

export function listMonthlyBankFiles(root = bankStatementsRoot()): MonthlyBankFile[] {
  const files: MonthlyBankFile[] = [];
  const years = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  for (const yearDir of years) {
    const dir = path.join(root, yearDir);
    for (const filename of readdirSync(dir).sort()) {
      if (!/\.xls$/i.test(filename) || filename.startsWith("~$")) continue;
      files.push({ yearDir, filename, filePath: path.join(dir, filename) });
    }
  }

  return files;
}

export function listPdfBankFiles(root = bankStatementsRoot()): MonthlyBankFile[] {
  const files: MonthlyBankFile[] = [];
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.toLowerCase() !== "consolidated")
    .map((entry) => entry.name)
    .sort();

  for (const yearDir of dirs) {
    const dir = path.join(root, yearDir);
    for (const filename of readdirSync(dir).sort()) {
      if (!/\.pdf$/i.test(filename) || filename.startsWith("~$")) continue;
      files.push({ yearDir, filename, filePath: path.join(dir, filename) });
    }
  }

  return files;
}
