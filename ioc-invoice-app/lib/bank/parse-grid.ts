import { categorizeBankTransaction } from "@/lib/bank/categorize";
import {
  fyLabelFromDate,
  headerLabel,
  normalizeAccountNumber,
  parseAmount,
  parseOptionalAmount,
  toIsoDate,
} from "@/lib/bank/parse-values";
import type { ParsedBankStatement, ParsedBankTransaction } from "@/lib/bank/types";

function cell(grid: string[][], row: number, col: number): string {
  return (grid[row]?.[col] ?? "").trim();
}

export function parseBankGrid(grid: string[][], sourceSheet: string): ParsedBankStatement | null {
  const meta: Record<string, string> = {};
  let headerRow = -1;
  let openingBalance: number | null = null;

  for (let r = 0; r < grid.length; r++) {
    const label = headerLabel(cell(grid, r, 0));
    const valueText = cell(grid, r, 1);
    if (label.includes("txn date")) {
      headerRow = r;
      continue;
    }
    if (label.startsWith("balance on") || label.startsWith("opening balance")) {
      openingBalance = parseOptionalAmount(cell(grid, r, 1));
    }
    if (label && valueText) meta[label] = valueText;
  }

  if (headerRow < 0) return null;

  const transactions: ParsedBankTransaction[] = [];
  let lineNumber = 0;

  for (let r = headerRow + 1; r < grid.length; r++) {
    const description = cell(grid, r, 2);
    if (/unable to retrieve/i.test(description) || /unable to retrieve/i.test(cell(grid, r, 0))) {
      continue;
    }

    const txnDate = toIsoDate(cell(grid, r, 0));
    const debit = parseAmount(cell(grid, r, 5));
    const credit = parseAmount(cell(grid, r, 6));
    if (!txnDate) continue;
    if (!description && debit === 0 && credit === 0) continue;

    lineNumber += 1;
    transactions.push({
      lineNumber,
      txnDate,
      valueDate: toIsoDate(cell(grid, r, 1)),
      description: description || "(blank)",
      referenceNo: cell(grid, r, 3) || null,
      branchCode: cell(grid, r, 4) || null,
      debit,
      credit,
      balance: parseOptionalAmount(cell(grid, r, 7)),
      category: categorizeBankTransaction(description, debit, credit),
    });
  }

  if (!transactions.length) return null;

  const periodFrom = transactions[0].txnDate;
  const periodTo = transactions[transactions.length - 1].txnDate;
  const accountNumber = normalizeAccountNumber(meta["account number"] ?? "");
  if (!accountNumber) {
    throw new Error(`Missing account number on sheet ${sourceSheet}`);
  }

  const lastWithBalance = [...transactions].reverse().find((row) => row.balance != null);

  return {
    fyLabel: fyLabelFromDate(periodFrom),
    periodFrom,
    periodTo,
    accountName: meta["account name"] || null,
    accountNumber,
    accountDescription: meta["account description"] || null,
    branch: meta["branch"] || null,
    ifsc: meta["ifs code"] || meta["ifsc"] || null,
    openingBalance,
    closingBalance: lastWithBalance?.balance ?? null,
    sourceSheet,
    transactions,
  };
}

export function dedupeStatements(statements: ParsedBankStatement[]): ParsedBankStatement[] {
  const unique: ParsedBankStatement[] = [];
  const seenPeriods = new Set<string>();
  for (const statement of statements) {
    const key = `${statement.accountNumber}:${statement.periodFrom}:${statement.periodTo}`;
    if (seenPeriods.has(key)) continue;
    seenPeriods.add(key);
    unique.push(statement);
  }
  return unique;
}
