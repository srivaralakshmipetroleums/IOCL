import { BANK_CATEGORY_LABELS, type BankTransactionCategory } from "@/lib/bank/categorize";
import { PAD_REPORT_COLORS } from "@/lib/reports/pad-workbook";

const CATEGORY_FILL: Partial<Record<BankTransactionCategory, string>> = {
  IOCL_PAYMENT: PAD_REPORT_COLORS.debit,
  IOCL_CREDIT: PAD_REPORT_COLORS.credit,
  PHONEPE: "FFE8DDF7",
  PAYTM: "FFE0F4FF",
  CARD_SETTLEMENT: "FFDBEAFE",
  POS_CARD: "FFE0E7FF",
  CASH_DEPOSIT: PAD_REPORT_COLORS.credit,
  UPI_CREDIT: "FFF3E8FF",
  UPI_DEBIT: PAD_REPORT_COLORS.debit,
  SALARY: "FFDDEBF7",
  BANK_CHARGE: PAD_REPORT_COLORS.charge,
  NACH_ACH: PAD_REPORT_COLORS.charge,
  CHEQUE: "FFF3F4F6",
  NEFT: "FFDDEBF7",
  RTGS: "FFDDEBF7",
  IMPS: "FFDDEBF7",
  TRANSFER: "FFF3F4F6",
  INTEREST: PAD_REPORT_COLORS.credit,
  OTHER: "FFF3F4F6",
};

const RECON_FILL: Record<string, string> = {
  MATCHED: PAD_REPORT_COLORS.matched,
  BANK_ONLY: PAD_REPORT_COLORS.padOnly,
  PAD_ONLY: PAD_REPORT_COLORS.invoiceOnly,
  AMOUNT_MISMATCH: PAD_REPORT_COLORS.mismatch,
};

export function bankCategoryLabel(category: BankTransactionCategory): string {
  return BANK_CATEGORY_LABELS[category];
}

export function bankCategoryFill(category: BankTransactionCategory): string | undefined {
  return CATEGORY_FILL[category];
}

export function bankReconFill(status: string): string {
  return RECON_FILL[status] ?? PAD_REPORT_COLORS.altRowBg;
}

export const BANK_REPORT_FOOTER =
  "&LSri Varalakshmi Petroleums - Bank Statement Report&RPage &P of &N";
