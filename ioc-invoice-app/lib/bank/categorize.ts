export const BANK_TRANSACTION_CATEGORIES = [
  "IOCL_PAYMENT",
  "IOCL_CREDIT",
  "PHONEPE",
  "PAYTM",
  "CARD_SETTLEMENT",
  "POS_CARD",
  "CASH_DEPOSIT",
  "UPI_CREDIT",
  "UPI_DEBIT",
  "SALARY",
  "BANK_CHARGE",
  "NACH_ACH",
  "CHEQUE",
  "NEFT",
  "RTGS",
  "IMPS",
  "TRANSFER",
  "INTEREST",
  "OTHER",
] as const;

export type BankTransactionCategory = (typeof BANK_TRANSACTION_CATEGORIES)[number];

export const BANK_CATEGORY_LABELS: Record<BankTransactionCategory, string> = {
  IOCL_PAYMENT: "IOCL payments",
  IOCL_CREDIT: "IOCL credits",
  PHONEPE: "PhonePe",
  PAYTM: "Paytm",
  CARD_SETTLEMENT: "Card settlements",
  POS_CARD: "POS cards",
  CASH_DEPOSIT: "Cash deposits",
  UPI_CREDIT: "UPI in",
  UPI_DEBIT: "UPI out",
  SALARY: "Salary",
  BANK_CHARGE: "Bank charges",
  NACH_ACH: "NACH / ACH",
  CHEQUE: "Cheque",
  NEFT: "NEFT",
  RTGS: "RTGS",
  IMPS: "IMPS",
  TRANSFER: "Other transfers",
  INTEREST: "Interest",
  OTHER: "Other",
};

function normalize(text: string): string {
  return text.toUpperCase().replace(/\s+/g, " ").trim();
}

export function isPaytmNarration(description: string): boolean {
  const text = normalize(description);
  if (text.includes("PHONEPE") || text.includes("PHONE PE")) return false;
  if (text.includes("PAYTM") || text.includes("ONE97") || text.includes("ONE 97")) return true;
  if (text.includes("COMMUNICA") && (text.includes("YESB") || text.includes("YESAP"))) return true;
  // Paytm settlement via Yes Bank RTGS (no beneficiary name in narration)
  if (text.includes("RTGS") && text.includes("YESBR")) return true;
  return false;
}

export function isPhonePeNarration(description: string): boolean {
  const text = normalize(description);
  if (text.includes("PHONEPE") || text.includes("PHONE PE")) return true;
  // Early PhonePe via IOCL dealer IMPS (Ioclsrivar): BY MAA000… 99922 TRANSFER … INB MAA000… IMPS…
  if (
    /BY M[A-Z]{2}000\d+\s+99922 TRANSFER/.test(text) &&
    /INB M[A-Z]{2}000/.test(text) &&
    text.includes("IMPS")
  ) {
    return true;
  }
  if (text.includes("IOCLSRIVAR") && text.includes("IMPS")) return true;
  return false;
}

/** IOCL corporate / dealer flows — not PhonePe pump codes like "F09 Iocls". */
export function isIoclNarration(description: string): boolean {
  const text = normalize(description);
  if (text.includes("INDIAN OIL")) return true;
  if (text.includes("--IOCL")) return true;
  if (text.includes("IOCLS")) return true;
  return false;
}

/** Pump POS bulk settlement credits (incl. older "BULK / … POSTING- CR_" PDF format). */
export function isBulkPostingNarration(description: string): boolean {
  const text = normalize(description);
  if (text.includes("BULK POSTING")) return true;
  if (text.includes("BULK") && text.includes("POSTING") && text.includes("CR_")) return true;
  return false;
}

/** ICICI/CMS POS credit or debit card credits — not bulk posting settlements. */
export function isPosCardNarration(description: string): boolean {
  const text = normalize(description);
  if (isBulkPostingNarration(text) || text.includes("POS RENT") || text.includes("GPRS RENT")) {
    return false;
  }
  return (
    text.includes("CREDIT CARD") ||
    text.includes("DEBIT CARD OPER") ||
    text.includes("CARD OPER")
  );
}

export function categorizeBankTransaction(
  description: string,
  debit: number,
  credit: number
): BankTransactionCategory {
  const text = normalize(description);

  if (isPhonePeNarration(text)) return "PHONEPE";
  if (isPaytmNarration(text)) return "PAYTM";

  if (isIoclNarration(text)) {
    return debit > 0 ? "IOCL_PAYMENT" : "IOCL_CREDIT";
  }

  if (isBulkPostingNarration(text)) return "CARD_SETTLEMENT";
  if (isPosCardNarration(text)) return "POS_CARD";
  if (text.includes("CASH DEPOSIT") || (text.includes("CASH") && credit > 0 && debit === 0)) {
    return "CASH_DEPOSIT";
  }
  if (text.includes("UPI/CR") || (text.includes("UPI") && credit > 0 && !text.includes("UPI/DR"))) {
    return "UPI_CREDIT";
  }
  if (text.includes("UPI/DR") || (text.includes("UPI") && debit > 0)) return "UPI_DEBIT";
  if (text.includes("SALARY")) return "SALARY";

  if (
    text.includes("CASH HANDLING") ||
    text.includes("CHARGES") ||
    text.includes("CHARGE") ||
    text.includes("POS RENT") ||
    text.includes("GPRS RENT") ||
    text.includes("GST") ||
    text.includes("SMS") ||
    text.includes("MINIMUM BALANCE")
  ) {
    return "BANK_CHARGE";
  }

  if (text.includes("ACH") || text.includes("NACH") || text.includes("MANDATE")) return "NACH_ACH";
  if (text.includes("CHEQUE") || text.includes("CHQ")) return "CHEQUE";
  if (text.includes("INTEREST")) return "INTEREST";
  if (text.includes("IMPS")) return "IMPS";
  if (text.includes("NEFT")) return "NEFT";
  if (text.includes("RTGS")) return "RTGS";
  if (text.includes("TO TRANSFER") || text.includes("BY TRANSFER")) return "TRANSFER";

  return "OTHER";
}
