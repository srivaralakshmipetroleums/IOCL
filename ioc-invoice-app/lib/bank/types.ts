import type { BankTransactionCategory } from "@/lib/bank/categorize";

export interface ParsedBankTransaction {
  lineNumber: number;
  txnDate: string;
  valueDate: string | null;
  description: string;
  referenceNo: string | null;
  branchCode: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  category: BankTransactionCategory;
}

export interface ParsedBankStatement {
  fyLabel: string;
  periodFrom: string;
  periodTo: string;
  accountName: string | null;
  accountNumber: string;
  accountDescription: string | null;
  branch: string | null;
  ifsc: string | null;
  openingBalance: number | null;
  closingBalance: number | null;
  sourceSheet: string;
  transactions: ParsedBankTransaction[];
}

export interface BankTransactionRow {
  id: string;
  statement_id: string;
  line_number: number;
  txn_date: string;
  value_date: string | null;
  description: string;
  reference_no: string | null;
  branch_code: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  category: BankTransactionCategory;
}

export interface BankStatementRow {
  id: string;
  fy_label: string;
  period_from: string;
  period_to: string;
  account_name: string | null;
  account_number: string;
  opening_balance: number | null;
  closing_balance: number | null;
}
