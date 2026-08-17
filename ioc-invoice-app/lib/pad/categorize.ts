export const PAD_TRANSACTION_CATEGORIES = [
  "FUEL_MS",
  "FUEL_HSD",
  "PAYMENT",
  "MARGIN",
  "DISCOUNT",
  "FEE",
  "INTEREST",
  "CREDIT_MEMO",
  "SUMMARY",
  "OTHER",
] as const;

export type PadTransactionCategory = (typeof PAD_TRANSACTION_CATEGORIES)[number];

export function categorizePadTransaction(
  documentType: string | null | undefined,
  itemText: string,
  materialGroup: string | null | undefined
): PadTransactionCategory {
  const type = (documentType || "").trim();
  const text = itemText.toUpperCase();
  const material = (materialGroup || "").toUpperCase();

  if (text.includes("CL.BAL") || text.includes("OPEN DELIVERY VALUE")) {
    return "SUMMARY";
  }

  if (type === "Billing doc.transfer") {
    if (material.includes("MS")) return "FUEL_MS";
    if (material.includes("HSD")) return "FUEL_HSD";
    if (text.includes("DEALER MARGIN") || text.includes("MARGIN")) return "MARGIN";
    if (text.includes("DISCOUNT") || text.includes("INCENTIVE")) return "DISCOUNT";
    return "OTHER";
  }

  if (type === "Customer ECollection" || type === "Customer payment") return "PAYMENT";
  if (type === "Cust IntrestManually") return "INTEREST";
  if (type === "Customer credit memo") return "CREDIT_MEMO";
  if (type === "Customer debit memo") return "FEE";

  return "OTHER";
}
