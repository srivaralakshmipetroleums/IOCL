import type { PadTransactionRow } from "@/lib/pad/types";
import { isFuelSupplyRow } from "@/lib/pad/query-helpers";

const CREDIT_SKIP = new Set(["PAYMENT", "MARGIN", "DISCOUNT", "CREDIT_MEMO", "SUMMARY"]);

export function chargeReferenceText(row: PadTransactionRow): string {
  return `${row.item_text || ""} ${row.document_number || ""}`.trim();
}

export function stripChargeDocPrefix(text: string): string {
  return text
    .replace(/^\d{6,}\s*['’:.\-]*\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function chargeDisplayName(row: PadTransactionRow): string {
  const raw = stripChargeDocPrefix(row.item_text || row.document_number || "");
  const upper = raw.toUpperCase();

  if (upper.includes("LICENSE") || upper.includes("LICENCE") || upper.includes("SSLF")) {
    return "Licence fee";
  }
  if (upper.includes("PARTICIPATION")) return "Participation fee";
  if (upper.includes("E-LOCK") || upper.includes("E LOCK") || upper.includes("C4 E")) {
    return "C4 E-lock recovery";
  }
  if (
    row.category === "INTEREST" ||
    upper.includes("INTEREST") ||
    upper.includes("INTREST") ||
    upper.startsWith("INT/") ||
    upper.includes("INT. POST")
  ) {
    return "Interest";
  }
  if (upper.includes("RENTAL") || /\bA6\b/.test(upper)) return "Rental";
  if (upper.includes("TDS")) return "TDS";
  if (upper.includes("FIXED FEE")) return "Non-refundable fixed fee";
  if (upper.includes("MISC RECOVERY")) return "Other misc recovery";
  if (upper.includes("LEASING")) return "Leasing / rental";
  if (upper.includes("PENALTY") || upper.includes("SETTLEMENT")) return "Penalty";

  if (!raw || /^\d{10}$/.test(raw)) return "Other";
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

/** Fuel purchase rows: reference contains Product Supply Invoice — Sales. */
export function isProductSupplyInvoice(row: PadTransactionRow): boolean {
  return chargeReferenceText(row).toUpperCase().includes("PRODUCT SUPPLY INVOICE");
}

export function isTruncatedFuelInvoice(row: PadTransactionRow): boolean {
  const text = (row.item_text || "").trim();
  return (
    (row.category === "FUEL_MS" || row.category === "FUEL_HSD") &&
    /^\d{10}$/.test(text) &&
    (row.quantity ?? 0) > 0
  );
}

/** Any PAD debit that is not a fuel product-supply invoice. */
export function isChargeRow(row: PadTransactionRow): boolean {
  if (CREDIT_SKIP.has(row.category)) return false;
  if (row.debit <= 0) return false;
  if (isFuelSupplyRow(row) || isProductSupplyInvoice(row)) return false;
  if (isTruncatedFuelInvoice(row)) return false;
  return true;
}

/** @deprecated Use chargeDisplayName. Kept for existing tests. */
export function classifyFeeSubtype(row: PadTransactionRow): string {
  const name = chargeDisplayName(row);
  if (name === "Interest") return "INTEREST";
  if (name === "Rental") return "RENTAL";
  if (name === "Penalty") return "PENALTY";
  if (name === "Participation fee") return "PARTICIPATION";
  if (name === "Licence fee") return "LICENSE";
  return "OTHER_FEE";
}
