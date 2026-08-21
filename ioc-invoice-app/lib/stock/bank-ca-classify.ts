import { extractTransferPartyName } from "@/lib/bank/transfer-party";
import type { BankTransactionRow } from "@/lib/bank/types";
import { roundMoney } from "@/lib/dashboard/format";

const UPI_CREDIT_COLLECTION_MIN = 50_000;

const WALK_IN = new Set([
  "CASH_DEPOSIT",
  "PHONEPE",
  "PAYTM",
  "CARD_SETTLEMENT",
  "POS_CARD",
]);

export interface BankCaBuckets {
  walkInReceipts: number;
  creditSaleCollections: number;
  ioclPayments: number;
  otherBusinessPayments: number;
  otherCredits: number;
  otherDebits: number;
  ownAccountTransfers: number;
  salaries: number;
  bankCharges: number;
  otherOperatingExpenses: number;
}

function partyLabel(row: BankTransactionRow): string {
  return extractTransferPartyName(row.description, row.category, row.reference_no);
}

function isFamilyParty(label: string): boolean {
  return /GUDAPAREDDY|BHASKARA|TEJESWAR|GUDDETI/i.test(label);
}

function isLoanParty(label: string, description: string): boolean {
  const text = `${label} ${description}`;
  return /CHOLAMANDAL|BAJAJ|HDFC BANK/i.test(text);
}

function isCreditCustomer(label: string): boolean {
  return /THIRUMALA|NYRR|MALIKIREDDY|BOGGU|VARALAKSHMI|ILAHI/i.test(label);
}

function isSupplier(label: string): boolean {
  return /TARUNI/i.test(label);
}

function isMerchantDisbursement(label: string, description: string): boolean {
  return /MERCHANT/i.test(`${label} ${description}`);
}

function isUnlabelledOwnTransfer(row: BankTransactionRow, label: string): boolean {
  if (label !== "Unspecified") return false;
  const text = row.description.toUpperCase();
  return (
    text.includes("UTILITY BILLS") ||
    text.includes("POOLING AC") ||
    text.includes("TO TRANSFER-INB--") ||
    text.includes("TRANSFER FROM--")
  );
}

function isBankChargeNarration(row: BankTransactionRow): boolean {
  if (row.category === "BANK_CHARGE") return true;
  const text = row.description.toUpperCase();
  return (
    text.includes("A/C KEEPING") ||
    text.includes("COMMITMENT") ||
    text.includes("POS RENT") ||
    text.includes("CASH HANDLING")
  );
}

export function classifyBankForCa(transactions: BankTransactionRow[]): BankCaBuckets {
  const buckets: BankCaBuckets = {
    walkInReceipts: 0,
    creditSaleCollections: 0,
    ioclPayments: 0,
    otherBusinessPayments: 0,
    otherCredits: 0,
    otherDebits: 0,
    ownAccountTransfers: 0,
    salaries: 0,
    bankCharges: 0,
    otherOperatingExpenses: 0,
  };

  for (const row of transactions) {
    const credit = row.credit || 0;
    const debit = row.debit || 0;
    const label = partyLabel(row);

    if (row.category === "IOCL_PAYMENT") {
      buckets.ioclPayments += debit;
      continue;
    }

    if (isBankChargeNarration(row) && debit > 0) {
      buckets.bankCharges += debit;
      continue;
    }

    if (row.category === "SALARY" && debit > 0) {
      buckets.salaries += debit;
      continue;
    }

    if (WALK_IN.has(row.category) && credit > 0) {
      buckets.walkInReceipts += credit;
      continue;
    }

    if (row.category === "UPI_CREDIT" && credit > 0) {
      if (credit >= UPI_CREDIT_COLLECTION_MIN) buckets.creditSaleCollections += credit;
      else buckets.walkInReceipts += credit;
      continue;
    }

    if (isMerchantDisbursement(label, row.description) && credit > 0) {
      buckets.walkInReceipts += credit;
      continue;
    }

    if (isSupplier(label)) {
      buckets.otherOperatingExpenses += debit - credit;
      buckets.otherBusinessPayments += debit;
      if (credit > 0) buckets.otherCredits += credit;
      continue;
    }

    if (isFamilyParty(label)) {
      buckets.ownAccountTransfers += debit;
      buckets.otherCredits += credit;
      continue;
    }

    if (isLoanParty(label, row.description) || row.category === "NACH_ACH") {
      buckets.otherDebits += debit;
      buckets.otherCredits += credit;
      continue;
    }

    if (isCreditCustomer(label) && credit > 0) {
      buckets.creditSaleCollections += credit;
      continue;
    }

    if (isUnlabelledOwnTransfer(row, label)) {
      buckets.ownAccountTransfers += debit;
      buckets.otherCredits += credit;
      continue;
    }

    if (
      (row.category === "NEFT" ||
        row.category === "RTGS" ||
        row.category === "IMPS" ||
        row.category === "CHEQUE" ||
        row.category === "TRANSFER") &&
      credit > 0
    ) {
      buckets.creditSaleCollections += credit;
      continue;
    }

    if (debit > 0) {
      buckets.ownAccountTransfers += debit;
    } else if (credit > 0) {
      buckets.otherCredits += credit;
    }
  }

  return {
    walkInReceipts: roundMoney(buckets.walkInReceipts),
    creditSaleCollections: roundMoney(buckets.creditSaleCollections),
    ioclPayments: roundMoney(buckets.ioclPayments),
    otherBusinessPayments: roundMoney(buckets.otherBusinessPayments),
    otherCredits: roundMoney(buckets.otherCredits),
    otherDebits: roundMoney(buckets.otherDebits),
    ownAccountTransfers: roundMoney(buckets.ownAccountTransfers),
    salaries: roundMoney(buckets.salaries),
    bankCharges: roundMoney(buckets.bankCharges),
    otherOperatingExpenses: roundMoney(buckets.otherOperatingExpenses),
  };
}
