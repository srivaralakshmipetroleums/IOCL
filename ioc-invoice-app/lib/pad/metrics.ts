import { chargeDisplayName, isChargeRow } from "@/lib/pad/fee-classify";
import { isFleetCardPayment } from "@/lib/pad/categorize";
import {
  fuelProductFromCategory,
  isFuelSupplyRow,
  monthKey,
} from "@/lib/pad/query-helpers";
import { buildRetailPriceLookup } from "@/lib/pad/retail-price-lookup";
import type {
  PadStatementRow,
  PadTransactionRow,
  RetailPriceRow,
} from "@/lib/pad/types";

const CREDIT_CATEGORIES = new Set(["PAYMENT", "MARGIN", "DISCOUNT", "CREDIT_MEMO"]);
const DEBIT_CATEGORIES = new Set(["FUEL_MS", "FUEL_HSD", "FEE", "INTEREST", "OTHER"]);

export interface PadExecutiveSummary {
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  netMovement: number;
  openDeliveryValue: number | null;
  moneyInvested: number;
  moneyInvestedSbi: number;
  moneyInvestedFleet: number;
  fuelPurchaseValue: number;
  fuelQuantityKl: number;
  fuelMsKl: number;
  fuelHsdKl: number;
  retailRevenue: number;
  grossPumpProfit: number;
  marginTotal: number;
  discountTotal: number;
  feesTotal: number;
  missingRetailPriceCount: number;
  fuelSupplyRowCount: number;
}

export interface PadBalancePoint {
  date: string;
  balance: number;
}

export interface PadCashFlowMonth {
  month: string;
  creditsIn: number;
  debitsOut: number;
  payments: number;
  margin: number;
  discounts: number;
  fuelDebits: number;
  charges: number;
}

export interface PadFuelPurchaseMonth {
  month: string;
  msKl: number;
  hsdKl: number;
  msValue: number;
  hsdValue: number;
}

export interface PadCommissionMonth {
  month: string;
  margin: number;
  discount: number;
}

export interface PadChargeBreakdown {
  name: string;
  count: number;
  totalDebit: number;
}

export interface PadChargeItem {
  id: string;
  date: string | null;
  name: string;
  reference: string;
  amount: number;
}

export interface PadChargePeriodTotal {
  period: string;
  total: number;
  byName: Record<string, number>;
}

export interface PadChargeReport {
  byType: PadChargeBreakdown[];
  byMonth: PadChargePeriodTotal[];
  byYear: PadChargePeriodTotal[];
  items: PadChargeItem[];
  periodTotal: number;
}

export interface PadGrossProfitMonth {
  month: string;
  msProfit: number;
  hsdProfit: number;
  dealerMargin: number;
  discount: number;
  charges: number;
  fuelProfit: number;
  netProfit: number;
}

export interface PadFuelProfitMonth {
  month: string;
  product: "MS" | "HSD";
  quantityKl: number;
  purchaseValue: number;
  purchaseRatePerL: number;
  retailRatePerL: number;
  retailRevenue: number;
  grossProfit: number;
}

export interface PadFuelProfitRow {
  transactionId: string;
  date: string;
  product: "MS" | "HSD";
  documentNumber: string | null;
  quantityKl: number;
  purchaseCost: number;
  purchaseRatePerL: number;
  retailPricePerL: number | null;
  retailRevenue: number;
  grossProfit: number;
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((acc, row) => acc + pick(row), 0);
}

function resolveOpeningBalance(
  statements: PadStatementRow[],
  transactions: PadTransactionRow[],
  dateFrom?: string
): number {
  if (dateFrom && statements.length) {
    const covering = statements.find(
      (s) => s.period_from <= dateFrom && s.period_to >= dateFrom
    );
    if (covering?.opening_balance != null) return covering.opening_balance;
  }

  const first = transactions.find((row) => row.balance != null);
  if (!first || first.balance == null) return 0;
  return first.balance - first.credit + first.debit;
}

function resolveClosingBalance(
  statements: PadStatementRow[],
  transactions: PadTransactionRow[],
  dateTo?: string
): number {
  const withBalance = transactions.filter((row) => row.balance != null);
  if (withBalance.length) {
    return withBalance[withBalance.length - 1].balance ?? 0;
  }

  if (dateTo && statements.length) {
    const covering = statements.find((s) => s.period_from <= dateTo && s.period_to >= dateTo);
    if (covering?.closing_balance != null) return covering.closing_balance;
  }

  return 0;
}

function resolveOpenDeliveryValue(statements: PadStatementRow[]): number | null {
  if (!statements.length) return null;
  const latest = statements[statements.length - 1];
  return latest.open_delivery_value;
}

export function computeFuelProfitRows(
  transactions: PadTransactionRow[],
  retailPrices: RetailPriceRow[]
): PadFuelProfitRow[] {
  const lookup = buildRetailPriceLookup(retailPrices);
  const rows: PadFuelProfitRow[] = [];

  for (const row of transactions) {
    if (!isFuelSupplyRow(row) || !row.transaction_date || !row.quantity) continue;

    const product = fuelProductFromCategory(row);
    if (!product) continue;

    const purchaseCost = row.debit - row.credit;
    const qtyLitres = row.quantity * 1000;
    const purchaseRatePerL = qtyLitres > 0 ? purchaseCost / qtyLitres : 0;
    const retailPricePerL = lookup(product, row.transaction_date);
    const retailRevenue = retailPricePerL != null ? qtyLitres * retailPricePerL : 0;
    const grossProfit = retailPricePerL != null ? retailRevenue - purchaseCost : 0;

    rows.push({
      transactionId: row.id,
      date: row.transaction_date,
      product,
      documentNumber: row.document_number,
      quantityKl: row.quantity,
      purchaseCost,
      purchaseRatePerL,
      retailPricePerL,
      retailRevenue,
      grossProfit,
    });
  }

  return rows;
}

export function computeExecutiveSummary(
  transactions: PadTransactionRow[],
  statements: PadStatementRow[],
  retailPrices: RetailPriceRow[],
  dateFrom?: string,
  dateTo?: string
): PadExecutiveSummary {
  const totalCredits = sum(transactions, (row) =>
    CREDIT_CATEGORIES.has(row.category) ? row.credit : 0
  );

  const totalDebits = sum(transactions, (row) => {
    if (row.category === "OTHER") return row.debit;
    return DEBIT_CATEGORIES.has(row.category) ? row.debit : 0;
  });

  const supplyRows = transactions.filter(isFuelSupplyRow);
  const profitRows = computeFuelProfitRows(transactions, retailPrices);

  const fuelMsKl = sum(supplyRows, (row) =>
    row.category === "FUEL_MS" ? row.quantity ?? 0 : 0
  );
  const fuelHsdKl = sum(supplyRows, (row) =>
    row.category === "FUEL_HSD" ? row.quantity ?? 0 : 0
  );

  const pricedRows = profitRows.filter((row) => row.retailPricePerL != null);

  const payments = transactions.filter((row) => row.category === "PAYMENT");
  const moneyInvestedSbi = sum(payments, (row) =>
    isFleetCardPayment(row.document_type, row.item_text) ? 0 : row.credit
  );
  const moneyInvestedFleet = sum(payments, (row) =>
    isFleetCardPayment(row.document_type, row.item_text) ? row.credit : 0
  );

  return {
    openingBalance: resolveOpeningBalance(statements, transactions, dateFrom),
    closingBalance: resolveClosingBalance(statements, transactions, dateTo),
    totalCredits,
    totalDebits,
    netMovement: totalCredits - totalDebits,
    openDeliveryValue: resolveOpenDeliveryValue(statements),
    moneyInvested: moneyInvestedSbi + moneyInvestedFleet,
    moneyInvestedSbi,
    moneyInvestedFleet,
    fuelPurchaseValue: sum(supplyRows, (row) => row.debit - row.credit),
    fuelQuantityKl: fuelMsKl + fuelHsdKl,
    fuelMsKl,
    fuelHsdKl,
    retailRevenue: sum(pricedRows, (row) => row.retailRevenue),
    grossPumpProfit: sum(pricedRows, (row) => row.grossProfit),
    marginTotal: sum(transactions, (row) => (row.category === "MARGIN" ? row.credit : 0)),
    discountTotal: sum(transactions, (row) => (row.category === "DISCOUNT" ? row.credit : 0)),
    feesTotal: sum(transactions, (row) => (isChargeRow(row) ? row.debit : 0)),
    missingRetailPriceCount: profitRows.filter((row) => row.retailPricePerL == null).length,
    fuelSupplyRowCount: supplyRows.length,
  };
}

export function computeBalanceTrend(transactions: PadTransactionRow[]): PadBalancePoint[] {
  return transactions
    .filter((row) => row.transaction_date && row.balance != null)
    .map((row) => ({
      date: row.transaction_date!,
      balance: row.balance!,
    }));
}

export function computeCashFlowByMonth(transactions: PadTransactionRow[]): PadCashFlowMonth[] {
  const map = new Map<string, PadCashFlowMonth>();

  for (const row of transactions) {
    const month = monthKey(row.transaction_date);
    if (!month) continue;

    const entry = map.get(month) ?? {
      month,
      creditsIn: 0,
      debitsOut: 0,
      payments: 0,
      margin: 0,
      discounts: 0,
      fuelDebits: 0,
      charges: 0,
    };

    if (row.category === "PAYMENT") {
      entry.payments += row.credit;
      entry.creditsIn += row.credit;
    } else if (row.category === "MARGIN") {
      entry.margin += row.credit;
      entry.creditsIn += row.credit;
    } else if (row.category === "DISCOUNT" || row.category === "CREDIT_MEMO") {
      entry.discounts += row.credit;
      entry.creditsIn += row.credit;
    } else if (isFuelSupplyRow(row)) {
      entry.fuelDebits += row.debit;
      entry.debitsOut += row.debit;
    } else if (isChargeRow(row)) {
      entry.charges += row.debit;
      entry.debitsOut += row.debit;
    } else if (DEBIT_CATEGORIES.has(row.category)) {
      entry.debitsOut += row.debit;
    }

    map.set(month, entry);
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function computeFuelPurchasesByMonth(
  transactions: PadTransactionRow[]
): PadFuelPurchaseMonth[] {
  const map = new Map<string, PadFuelPurchaseMonth>();

  for (const row of transactions) {
    if (!isFuelSupplyRow(row)) continue;
    const month = monthKey(row.transaction_date);
    if (!month) continue;

    const entry = map.get(month) ?? {
      month,
      msKl: 0,
      hsdKl: 0,
      msValue: 0,
      hsdValue: 0,
    };

    const value = row.debit - row.credit;
    if (row.category === "FUEL_MS") {
      entry.msKl += row.quantity ?? 0;
      entry.msValue += value;
    } else {
      entry.hsdKl += row.quantity ?? 0;
      entry.hsdValue += value;
    }

    map.set(month, entry);
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function computeCommissionsByMonth(
  transactions: PadTransactionRow[]
): PadCommissionMonth[] {
  const map = new Map<string, PadCommissionMonth>();

  for (const row of transactions) {
    const month = monthKey(row.transaction_date);
    if (!month) continue;

    const entry = map.get(month) ?? { month, margin: 0, discount: 0 };
    if (row.category === "MARGIN") entry.margin += row.credit;
    if (row.category === "DISCOUNT") entry.discount += row.credit;
    map.set(month, entry);
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function computeCommissionYtd(transactions: PadTransactionRow[]): number {
  return sum(transactions, (row) =>
    row.category === "MARGIN" || row.category === "DISCOUNT" ? row.credit : 0
  );
}

export function computeChargeReport(transactions: PadTransactionRow[]): PadChargeReport {
  const typeMap = new Map<string, PadChargeBreakdown>();
  const monthMap = new Map<string, PadChargePeriodTotal>();
  const yearMap = new Map<string, PadChargePeriodTotal>();
  const items: PadChargeItem[] = [];
  let periodTotal = 0;

  function addPeriod(
    map: Map<string, PadChargePeriodTotal>,
    period: string,
    name: string,
    amount: number
  ) {
    const entry = map.get(period) ?? { period, total: 0, byName: {} };
    entry.total += amount;
    entry.byName[name] = (entry.byName[name] ?? 0) + amount;
    map.set(period, entry);
  }

  for (const row of transactions) {
    if (!isChargeRow(row)) continue;
    const name = chargeDisplayName(row);
    const amount = row.debit;
    periodTotal += amount;

    const type = typeMap.get(name) ?? { name, count: 0, totalDebit: 0 };
    type.count += 1;
    type.totalDebit += amount;
    typeMap.set(name, type);

    const month = monthKey(row.transaction_date);
    if (month) addPeriod(monthMap, month, name, amount);
    const year = row.transaction_date?.slice(0, 4);
    if (year) addPeriod(yearMap, year, name, amount);

    items.push({
      id: row.id,
      date: row.transaction_date,
      name,
      reference: row.item_text,
      amount,
    });
  }

  items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return {
    byType: [...typeMap.values()].sort((a, b) => b.totalDebit - a.totalDebit),
    byMonth: [...monthMap.values()].sort((a, b) => a.period.localeCompare(b.period)),
    byYear: [...yearMap.values()].sort((a, b) => a.period.localeCompare(b.period)),
    items,
    periodTotal,
  };
}

export function computeChargeBreakdown(transactions: PadTransactionRow[]): PadChargeBreakdown[] {
  return computeChargeReport(transactions).byType;
}

export function computeFuelProfitByMonth(
  profitRows: PadFuelProfitRow[]
): PadFuelProfitMonth[] {
  const map = new Map<string, PadFuelProfitMonth>();

  for (const row of profitRows) {
    if (row.retailPricePerL == null) continue;
    const key = `${row.date.slice(0, 7)}:${row.product}`;
    const entry = map.get(key) ?? {
      month: row.date.slice(0, 7),
      product: row.product,
      quantityKl: 0,
      purchaseValue: 0,
      purchaseRatePerL: 0,
      retailRatePerL: 0,
      retailRevenue: 0,
      grossProfit: 0,
    };

    entry.quantityKl += row.quantityKl;
    entry.purchaseValue += row.purchaseCost;
    entry.retailRevenue += row.retailRevenue;
    entry.grossProfit += row.grossProfit;
    map.set(key, entry);
  }

  for (const entry of map.values()) {
    const qtyLitres = entry.quantityKl * 1000;
    entry.purchaseRatePerL = qtyLitres > 0 ? entry.purchaseValue / qtyLitres : 0;
    entry.retailRatePerL = qtyLitres > 0 ? entry.retailRevenue / qtyLitres : 0;
  }

  return [...map.values()].sort((a, b) =>
    a.month === b.month ? a.product.localeCompare(b.product) : a.month.localeCompare(b.month)
  );
}

export interface PadRateTrendPoint {
  month: string;
  msPurchasePerL: number | null;
  hsdPurchasePerL: number | null;
  msRetailPerL: number | null;
  hsdRetailPerL: number | null;
  msSpreadPerL: number | null;
  hsdSpreadPerL: number | null;
  msKl: number;
  hsdKl: number;
  totalKl: number;
}

export function computeRateTrend(profitRows: PadFuelProfitRow[]): PadRateTrendPoint[] {
  const map = new Map<
    string,
    {
      month: string;
      msPurchase: number;
      msQtyL: number;
      hsdPurchase: number;
      hsdQtyL: number;
      msRetail: number;
      hsdRetail: number;
    }
  >();

  for (const row of profitRows) {
    const month = row.date.slice(0, 7);
    const entry = map.get(month) ?? {
      month,
      msPurchase: 0,
      msQtyL: 0,
      hsdPurchase: 0,
      hsdQtyL: 0,
      msRetail: 0,
      hsdRetail: 0,
    };
    const litres = row.quantityKl * 1000;
    if (row.product === "MS") {
      entry.msPurchase += row.purchaseCost;
      entry.msQtyL += litres;
      if (row.retailPricePerL != null) entry.msRetail = row.retailPricePerL;
    } else {
      entry.hsdPurchase += row.purchaseCost;
      entry.hsdQtyL += litres;
      if (row.retailPricePerL != null) entry.hsdRetail = row.retailPricePerL;
    }
    map.set(month, entry);
  }

  return [...map.values()]
    .map((entry) => {
      const msPurchasePerL = entry.msQtyL ? entry.msPurchase / entry.msQtyL : null;
      const hsdPurchasePerL = entry.hsdQtyL ? entry.hsdPurchase / entry.hsdQtyL : null;
      const msRetailPerL = entry.msRetail || null;
      const hsdRetailPerL = entry.hsdRetail || null;
      return {
        month: entry.month,
        msPurchasePerL,
        hsdPurchasePerL,
        msRetailPerL,
        hsdRetailPerL,
        msSpreadPerL:
          msRetailPerL != null && msPurchasePerL != null ? msRetailPerL - msPurchasePerL : null,
        hsdSpreadPerL:
          hsdRetailPerL != null && hsdPurchasePerL != null ? hsdRetailPerL - hsdPurchasePerL : null,
        msKl: entry.msQtyL / 1000,
        hsdKl: entry.hsdQtyL / 1000,
        totalKl: (entry.msQtyL + entry.hsdQtyL) / 1000,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function computeGrossProfitByMonth(profitRows: PadFuelProfitRow[]) {
  const map = new Map<string, { month: string; msProfit: number; hsdProfit: number; total: number }>();

  for (const row of profitRows) {
    if (row.retailPricePerL == null) continue;
    const month = row.date.slice(0, 7);
    const entry = map.get(month) ?? { month, msProfit: 0, hsdProfit: 0, total: 0 };
    if (row.product === "MS") entry.msProfit += row.grossProfit;
    else entry.hsdProfit += row.grossProfit;
    entry.total += row.grossProfit;
    map.set(month, entry);
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}
