import { categorizeBankTransaction } from "@/lib/bank/categorize";
import { extractPdfLines } from "@/lib/bank/extract-pdf-lines";
import {
  fyLabelFromDate,
  headerLabel,
  normalizeAccountNumber,
  parseAmount,
  parseOptionalAmount,
  toIsoDate,
} from "@/lib/bank/parse-values";
import type { ParsedBankStatement, ParsedBankTransaction } from "@/lib/bank/types";

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const MONTH_RE = MONTHS.join("|");
const SLASH_START = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.*)$/;
const MON_START = new RegExp(`^(\\d{1,2})\\s+(${MONTH_RE})\\s+(\\d{1,2})\\s+(${MONTH_RE})\\s+(.*)$`);
const YEAR_CONT = /^(20\d{2})\s+(20\d{2})\b/;
const HEADER_SKIP =
  /Txn(\s+Date)?|Account Name|Account Statement|\*\*|Address |^Date\s*:|Balance as on|Value Date|No\.\/Cheque|Branch Code/i;

function isTxnStart(line: string): boolean {
  return SLASH_START.test(line) || MON_START.test(line);
}

function repairSplitRupeeAmounts(blob: string): string {
  const incomplete = blob.match(/[\d,]+\.\d(?!\d)/);
  if (!incomplete) return blob;
  const marker = "\0";
  const withoutIncomplete = blob.replace(incomplete[0], marker);
  const danglingZero = withoutIncomplete.match(/(^|\s)0(?=\s|$)/);
  if (!danglingZero) return blob;
  return withoutIncomplete.replace(danglingZero[0], danglingZero[1] ?? "").replace(marker, `${incomplete[0]}0`);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseBankPdfLines(lines: string[], sourceSheet: string): ParsedBankStatement | null {
  const meta: Record<string, string> = {};
  let openingBalance: number | null = null;

  for (const line of lines) {
    const match = line.match(/^(.*?):\s*(.*)$/);
    if (match) {
      const label = headerLabel(match[1]);
      const value = match[2].trim();
      if (label && value) meta[label] = value;
      if (label.startsWith("balance as on") || label.startsWith("opening balance")) {
        openingBalance = parseOptionalAmount(value);
      }
    }
  }

  const txns: Array<{
    txnDate: string;
    valueDate: string | null;
    blob: string;
  }> = [];

  for (let i = 0; i < lines.length; ) {
    const slash = lines[i].match(SLASH_START);
    const mon = lines[i].match(MON_START);
    if (!slash && !mon) {
      i += 1;
      continue;
    }

    let txnDate: string | null = null;
    let valueDate: string | null = null;
    const parts: string[] = [];

    if (slash) {
      txnDate = toIsoDate(slash[1]);
      valueDate = toIsoDate(slash[2]);
      parts.push(slash[3]);
      i += 1;
    } else if (mon) {
      parts.push(mon[5]);
      i += 1;
      let year1: string | undefined;
      let year2: string | undefined;
      if (i < lines.length) {
        const years = lines[i].match(YEAR_CONT);
        if (years) {
          year1 = years[1];
          year2 = years[2];
          const extra = lines[i].slice(years[0].length).trim();
          if (extra) parts.push(extra);
          i += 1;
        }
      }
      txnDate = toIsoDate(`${mon[1]} ${mon[2]} ${year1 ?? "2020"}`);
      valueDate = toIsoDate(`${mon[3]} ${mon[4]} ${year2 ?? year1 ?? "2020"}`);
    }

    while (
      i < lines.length &&
      !isTxnStart(lines[i]) &&
      !YEAR_CONT.test(lines[i]) &&
      !HEADER_SKIP.test(lines[i])
    ) {
      if (lines[i].trim()) parts.push(lines[i].trim());
      i += 1;
    }

    if (!txnDate) continue;
    txns.push({ txnDate, valueDate, blob: repairSplitRupeeAmounts(parts.join(" ")) });
  }

  if (!txns.length) return null;

  const accountNumber = normalizeAccountNumber(meta["account number"] ?? "");
  if (!accountNumber) {
    throw new Error(`Missing account number in ${sourceSheet}`);
  }

  const transactions: ParsedBankTransaction[] = [];
  let previousBalance = openingBalance;
  let lineNumber = 0;

  for (const txn of txns) {
    const amounts = txn.blob.match(/[\d,]+\.\d{2}/g) ?? [];
    if (!amounts.length) continue;

    const balance = parseAmount(amounts[amounts.length - 1]);
    const moved = amounts.length >= 2 ? parseAmount(amounts[amounts.length - 2]) : null;
    let debit = 0;
    let credit = 0;

    if (previousBalance == null) {
      if (moved == null) {
        credit = 0;
      } else if (round2(moved + (openingBalance ?? 0)) === round2(balance) || balance >= moved) {
        credit = moved;
      } else {
        debit = moved;
      }
    } else if (moved != null && Math.abs(round2(previousBalance + moved) - balance) <= 0.05) {
      credit = moved;
    } else if (moved != null && Math.abs(round2(previousBalance - moved) - balance) <= 0.05) {
      debit = moved;
    } else if (balance >= previousBalance) {
      credit = round2(balance - previousBalance);
    } else {
      debit = round2(previousBalance - balance);
    }

    const branchMatch = txn.blob.match(/\b(\d{1,5})\s+[\d,]+\.\d{2}/);
    const description = txn.blob
      .replace(/[\d,]+\.\d{2}/g, " ")
      .replace(/\b\d{1,5}\s*$/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    lineNumber += 1;
    transactions.push({
      lineNumber,
      txnDate: txn.txnDate,
      valueDate: txn.valueDate,
      description: description || "(blank)",
      referenceNo: null,
      branchCode: branchMatch?.[1] ?? null,
      debit,
      credit,
      balance,
      category: categorizeBankTransaction(description, debit, credit),
    });
    previousBalance = balance;
  }

  if (!transactions.length) return null;

  return {
    fyLabel: fyLabelFromDate(transactions[0].txnDate),
    periodFrom: transactions[0].txnDate,
    periodTo: transactions[transactions.length - 1].txnDate,
    accountName: meta["account name"] || null,
    accountNumber,
    accountDescription: meta["account description"] || null,
    branch: meta["branch"] || null,
    ifsc: meta["ifs code"] || meta["ifsc"] || null,
    openingBalance,
    closingBalance: transactions[transactions.length - 1].balance,
    sourceSheet,
    transactions,
  };
}

export async function parseBankStatementPdf(
  filePath: string,
  sourceFilename: string
): Promise<ParsedBankStatement | null> {
  const lines = await extractPdfLines(filePath);
  return parseBankPdfLines(lines, sourceFilename);
}
