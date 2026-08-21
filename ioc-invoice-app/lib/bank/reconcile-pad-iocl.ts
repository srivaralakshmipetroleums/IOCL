import { isFleetCardPayment } from "@/lib/pad/categorize";
import type { BankTransactionRow } from "@/lib/bank/types";
import type { PadTransactionRow } from "@/lib/pad/types";

export type BankPadReconStatus = "MATCHED" | "AMOUNT_MISMATCH" | "BANK_ONLY" | "PAD_ONLY";

export interface BankPadReconciliationRow {
  status: BankPadReconStatus;
  utr: string | null;
  bankDate: string | null;
  bankAmount: number | null;
  padDate: string | null;
  padAmount: number | null;
  difference: number | null;
  bankRef: string | null;
  padRef: string | null;
  note: string | null;
}

export interface BankPadReconciliationSummary {
  total: number;
  matched: number;
  amountMismatch: number;
  bankOnly: number;
  padOnly: number;
  bankTotal: number;
  padTotal: number;
}

interface BankMatchRow {
  date: string;
  amount: number;
  utr: string | null;
  description: string;
}

interface PadMatchRow {
  date: string;
  amount: number;
  utr: string | null;
  itemText: string;
}

const KNOWN_BANK_FEE_DELTAS = [47.2, 23.6];

/**
 * SBI RTGS UTR formats:
 * - Bank: SBINR12025040280866401 (SBIN + R + channel + century + 14-digit core)
 * - PAD:  SBIN25040280866401     (SBIN + 14-digit core)
 * Both normalize to the same 14-digit core: YYMMDD + 8-digit reference.
 */
export function extractSbiUtrDigits(text: string): string | null {
  const upper = text.toUpperCase();
  const sbIndex = upper.indexOf("SBIN");
  if (sbIndex < 0) return null;

  let index = sbIndex + 4;
  if (upper[index] === "R") index += 1;
  if (upper[index] === "1" || upper[index] === "5") index += 1;

  let digits = "";
  while (index < upper.length && /\d/.test(upper[index]!)) {
    digits += upper[index];
    index += 1;
  }

  if (digits.length < 10) return null;
  return digits;
}

export function normalizeBankPadUtr(text: string): string | null {
  const digits = extractSbiUtrDigits(text);
  if (!digits) return null;

  if (digits.length >= 16 && digits.startsWith("20")) {
    return digits.slice(-14);
  }
  if (digits.length >= 14) {
    return digits.slice(-14);
  }

  // Truncated bank narration – keep YYMMDD prefix for fuzzy match (min 8 digits).
  if (digits.startsWith("20")) {
    return digits.slice(2);
  }
  return digits;
}

export function utrKeysMatch(bankUtr: string | null, padUtr: string | null): boolean {
  if (!bankUtr || !padUtr) return false;
  if (bankUtr === padUtr) return true;

  const shorter = bankUtr.length <= padUtr.length ? bankUtr : padUtr;
  const longer = bankUtr.length <= padUtr.length ? padUtr : bankUtr;
  if (shorter.length >= 8 && longer.startsWith(shorter)) return true;

  return false;
}

function mismatchNote(diff: number): string {
  if (KNOWN_BANK_FEE_DELTAS.some((fee) => Math.abs(Math.abs(diff) - fee) < 0.01)) {
    return `Likely SBI RTGS/cheque charge (₹${Math.abs(diff).toFixed(2)}) bundled in bank debit`;
  }
  return "Amount differs between bank debit and PAD credit";
}

function amountMatches(bankAmount: number, padAmount: number): boolean {
  const diff = Math.abs(bankAmount - padAmount);
  if (diff < 1) return true;
  if (diff < 100) return true;
  return KNOWN_BANK_FEE_DELTAS.some((fee) => Math.abs(diff - fee) < 0.01);
}

function findPadMatch(
  bank: BankMatchRow,
  padRows: PadMatchRow[],
  padByUtr: Map<string, PadMatchRow[]>,
  usedPad: Set<PadMatchRow>
): PadMatchRow | undefined {
  if (bank.utr) {
    const exact = padByUtr.get(bank.utr)?.find((p) => !usedPad.has(p));
    if (exact) return exact;

    for (const pad of padRows) {
      if (usedPad.has(pad)) continue;
      if (utrKeysMatch(bank.utr, pad.utr)) return pad;
    }
  }

  const sameDay = padRows.filter((p) => !usedPad.has(p) && p.date === bank.date);
  return (
    sameDay.find((p) => Math.abs(p.amount - bank.amount) < 1) ??
    sameDay.find((p) => amountMatches(bank.amount, p.amount))
  );
}

export function reconcileBankPadIocl(
  bankRows: BankMatchRow[],
  padRows: PadMatchRow[]
): BankPadReconciliationRow[] {
  const padByUtr = new Map<string, PadMatchRow[]>();

  for (const row of padRows) {
    if (!row.utr) continue;
    const list = padByUtr.get(row.utr) ?? [];
    list.push(row);
    padByUtr.set(row.utr, list);
  }

  const usedPad = new Set<PadMatchRow>();
  const results: BankPadReconciliationRow[] = [];

  for (const bank of bankRows) {
    const pad = findPadMatch(bank, padRows, padByUtr, usedPad);

    if (!pad) {
      results.push({
        status: "BANK_ONLY",
        utr: bank.utr,
        bankDate: bank.date,
        bankAmount: bank.amount,
        padDate: null,
        padAmount: null,
        difference: null,
        bankRef: bank.description,
        padRef: null,
        note: "Bank IOCL debit with no matching PAD payment in period",
      });
      continue;
    }

    usedPad.add(pad);
    const diff = bank.amount - pad.amount;
    const status: BankPadReconStatus =
      Math.abs(diff) < 1 ? "MATCHED" : "AMOUNT_MISMATCH";
    results.push({
      status,
      utr: bank.utr ?? pad.utr,
      bankDate: bank.date,
      bankAmount: bank.amount,
      padDate: pad.date,
      padAmount: pad.amount,
      difference: status === "AMOUNT_MISMATCH" ? diff : diff !== 0 ? diff : null,
      bankRef: bank.description,
      padRef: pad.itemText,
      note: status === "AMOUNT_MISMATCH" ? mismatchNote(diff) : null,
    });
  }

  for (const pad of padRows) {
    if (usedPad.has(pad)) continue;
    results.push({
      status: "PAD_ONLY",
      utr: pad.utr,
      bankDate: null,
      bankAmount: null,
      padDate: pad.date,
      padAmount: pad.amount,
      difference: null,
      bankRef: null,
      padRef: pad.itemText,
      note: "PAD payment credit with no matching bank IOCL debit in period",
    });
  }

  return results.sort((a, b) => {
    const da = a.bankDate ?? a.padDate ?? "";
    const db = b.bankDate ?? b.padDate ?? "";
    return da.localeCompare(db);
  });
}

export function bankRowsForPadReconciliation(transactions: BankTransactionRow[]): BankMatchRow[] {
  return transactions
    .filter((row) => row.category === "IOCL_PAYMENT" && row.debit > 0)
    .map((row) => ({
      date: row.txn_date,
      amount: row.debit,
      utr: normalizeBankPadUtr(`${row.description} ${row.reference_no ?? ""}`),
      description: row.description,
    }));
}

export function padRowsForBankReconciliation(transactions: PadTransactionRow[]): PadMatchRow[] {
  return transactions
    .filter((row) => row.category === "PAYMENT" && row.credit > 0)
    .filter((row) => !isFleetCardPayment(row.document_type, row.item_text))
    .map((row) => ({
      date: row.transaction_date ?? "",
      amount: row.credit,
      utr: normalizeBankPadUtr(row.item_text ?? ""),
      itemText: row.item_text,
    }))
    .filter((row) => row.date);
}

export function summarizeBankPadReconciliation(
  rows: BankPadReconciliationRow[],
  bankTotal: number,
  padTotal: number
): BankPadReconciliationSummary {
  return {
    total: rows.length,
    matched: rows.filter((r) => r.status === "MATCHED").length,
    amountMismatch: rows.filter((r) => r.status === "AMOUNT_MISMATCH").length,
    bankOnly: rows.filter((r) => r.status === "BANK_ONLY").length,
    padOnly: rows.filter((r) => r.status === "PAD_ONLY").length,
    bankTotal,
    padTotal,
  };
}
