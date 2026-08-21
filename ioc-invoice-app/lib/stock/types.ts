export const STOCK_PRODUCTS = ["MS", "HSD"] as const;

export type StockProduct = (typeof STOCK_PRODUCTS)[number];

export type StockScope = "month" | "financial_year";

export type StockSnapshotKind = "opening" | "closing";

export type StockCoverage = "full" | "fy_boundaries" | "partial" | "none";

export interface StockSnapshotRow {
  id: string;
  scope: StockScope;
  period_key: string;
  product: StockProduct;
  snapshot_kind: StockSnapshotKind;
  quantity_litres: number;
  effective_date: string;
  notes: string | null;
}

export interface StockProductMovement {
  product: StockProduct;
  label: string;
  openingLitres: number | null;
  purchasesLitres: number;
  closingLitres: number | null;
  impliedSalesLitres: number | null;
}

export interface StockPeriodSummary {
  coverage: StockCoverage;
  coverageNote: string | null;
  ms: StockProductMovement;
  hsd: StockProductMovement;
  totalOpeningLitres: number | null;
  totalPurchasesLitres: number;
  totalClosingLitres: number | null;
  totalImpliedSalesLitres: number | null;
}

export interface StockReconciliationRow {
  product: StockProduct | "TOTAL";
  label: string;
  openingLitres: number | null;
  purchaseLitres: number;
  closingLitres: number | null;
  actualSoldLitres: number | null;
}

export interface InvoiceProfitLineRow {
  invoiceNumber: string;
  invoiceDate: string;
  fuel: StockProduct;
  fuelLabel: string;
  quantityLitres: number;
  purchasePerL: number | null;
  rspPerL: number | null;
  purchaseValue: number;
  salesValue: number | null;
  grossProfit: number | null;
}

export interface ProductFuelProfit {
  product: StockProduct | "TOTAL";
  label: string;
  actualSoldLitres: number | null;
  purchasePerL: number | null;
  rspPerL: number | null;
  purchaseCost: number | null;
  salesValue: number | null;
  grossProfit: number | null;
}

export interface ProfitLedgerLine {
  label: string;
  amount: number | null;
  kind: "base" | "deduction" | "credit" | "subtotal" | "total";
}

export interface OutletProfitAndLoss {
  msSales: number | null;
  hsdSales: number | null;
  totalFuelSales: number | null;
  costOfMsSold: number | null;
  costOfHsdSold: number | null;
  totalFuelCost: number | null;
  grossFuelProfit: number | null;
  netPadContribution: number;
  otherOperatingIncome: number;
  salaries: number;
  bankCharges: number;
  otherOperatingExpenses: number;
  otherBusinessExpenses: number;
  netProfit: number | null;
  lines: ProfitLedgerLine[];
}

export interface BankCaReconciliation {
  walkInReceipts: number;
  creditSaleCollections: number;
  ioclPayments: number;
  otherBusinessPayments: number;
  otherCredits: number;
  otherDebits: number;
  ownAccountTransfers: number;
  closingBankBalance: number;
  closingPadOutstanding: number;
  lines: ProfitLedgerLine[];
}

export interface PadMoneyReconciliation {
  dealerCommission: number;
  discount: number;
  padDeductions: number;
  otherPadCharges: number;
  padCharges: { label: string; amount: number }[];
  padChargesTotal: number;
  otherDeductions: number;
  netPadContribution: number;
}

export interface FuelSalesReport {
  stockReconciliation: StockReconciliationRow[];
  invoiceLines: InvoiceProfitLineRow[];
  fuelGrossProfit: ProductFuelProfit[];
  profitAndLoss: OutletProfitAndLoss;
  bankReconciliation: BankCaReconciliation;
  padMoney: PadMoneyReconciliation;
  ownerNotes: string[];
  stockNote: string | null;
}

export interface BusinessDashboardPayload {
  stock: StockPeriodSummary;
  fuelSalesReport: FuelSalesReport;
  invoice: {
    invoiceCount: number;
    totalValue: number;
    totalQuantityLitres: number;
    msPurchasesLitres: number;
    hsdPurchasesLitres: number;
  };
  pad: {
    openingBalance: number;
    closingBalance: number;
    fuelPurchaseValue: number;
    fuelQuantityKl: number;
    grossPumpProfit: number;
    ioclPayments: number;
  };
  bank: {
    openingBalance: number;
    closingBalance: number;
    totalCollections: number;
    ioclPayments: number;
    netOperatingCash: number;
  };
  reconciliation: {
    bankPadIoclMatched: number;
    bankPadIoclMismatch: number;
    bankPadIoclBankOnly: number;
    bankPadIoclPadOnly: number;
    invoiceVsPadKlDiff: number | null;
  };
}
