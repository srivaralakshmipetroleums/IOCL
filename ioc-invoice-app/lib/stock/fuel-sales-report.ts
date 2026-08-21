import type { BankTransactionRow } from "@/lib/bank/types";
import type { BankExecutiveSummary } from "@/lib/bank/metrics";
import { normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import {
  fuelMarginFromSpread,
  fuelSpreadPerLitre,
  roundMoney,
  roundRatePerLitre,
} from "@/lib/dashboard/format";
import { buildRetailPriceLookup } from "@/lib/pad/retail-price-lookup";
import type { PadChargeReport } from "@/lib/pad/metrics";
import type { PadTransactionRow, RetailPriceRow } from "@/lib/pad/types";
import { classifyBankForCa } from "@/lib/stock/bank-ca-classify";
import { stockProductFromFuel } from "@/lib/stock/resolve-period";
import type {
  BankCaReconciliation,
  FuelSalesReport,
  InvoiceProfitLineRow,
  OutletProfitAndLoss,
  PadMoneyReconciliation,
  ProductFuelProfit,
  ProfitLedgerLine,
  StockPeriodSummary,
  StockProduct,
  StockReconciliationRow,
} from "@/lib/stock/types";

const PRODUCT_LABELS: Record<StockProduct, string> = {
  MS: "Petrol (MS)",
  HSD: "Diesel (HSD)",
};

interface InvoiceHeader {
  id: string;
  invoice_date: string | null;
  invoice_number: string | null;
  sap_entry_number: string | null;
}

interface InvoiceFuelLine {
  invoice_id: string;
  product: string | null;
  invoice_value: number | null;
  output_quantity: number | null;
}

function weightedPerL(totalValue: number, totalLitres: number): number | null {
  if (totalLitres <= 0) return null;
  return roundRatePerLitre(totalValue / totalLitres);
}

function moneyLine(
  label: string,
  amount: number | null,
  kind: ProfitLedgerLine["kind"] = "base"
): ProfitLedgerLine {
  return { label, amount, kind };
}

function buildStockReconciliation(stock: StockPeriodSummary): StockReconciliationRow[] {
  function row(
    product: StockProduct | "TOTAL",
    label: string,
    opening: number | null,
    purchases: number,
    closing: number | null,
    actualSold: number | null
  ): StockReconciliationRow {
    return {
      product,
      label,
      openingLitres: opening,
      purchaseLitres: purchases,
      closingLitres: closing,
      actualSoldLitres: actualSold,
    };
  }

  const ms = stock.ms;
  const hsd = stock.hsd;
  const totalOpening =
    ms.openingLitres != null && hsd.openingLitres != null
      ? ms.openingLitres + hsd.openingLitres
      : null;
  const totalClosing =
    ms.closingLitres != null && hsd.closingLitres != null
      ? ms.closingLitres + hsd.closingLitres
      : null;
  const totalSold =
    ms.impliedSalesLitres != null && hsd.impliedSalesLitres != null
      ? ms.impliedSalesLitres + hsd.impliedSalesLitres
      : null;

  return [
    row("MS", PRODUCT_LABELS.MS, ms.openingLitres, ms.purchasesLitres, ms.closingLitres, ms.impliedSalesLitres),
    row("HSD", PRODUCT_LABELS.HSD, hsd.openingLitres, hsd.purchasesLitres, hsd.closingLitres, hsd.impliedSalesLitres),
    row("TOTAL", "Total", totalOpening, stock.totalPurchasesLitres, totalClosing, totalSold),
  ];
}

export function buildInvoiceProfitLines(
  invoices: InvoiceHeader[],
  lineItems: InvoiceFuelLine[],
  retailPrices: RetailPriceRow[]
): { lines: InvoiceProfitLineRow[] } {
  const lookup = buildRetailPriceLookup(retailPrices);
  const invoiceById = new Map(invoices.map((inv) => [inv.id, inv]));
  const lines: InvoiceProfitLineRow[] = [];

  for (const item of lineItems) {
    const fuel = normalizeFuelProduct(item.product);
    if (!fuel) continue;
    const invoice = invoiceById.get(item.invoice_id);
    const date = invoice?.invoice_date ?? "";
    const litres = Number(item.output_quantity) || 0;
    if (litres <= 0) continue;

    const stockProduct = stockProductFromFuel(fuel);
    const value = Number(item.invoice_value) || 0;
    const purchasePerL = litres > 0 ? roundRatePerLitre(value / litres) : null;
    const rspPerL = date ? lookup(stockProduct, date) : null;
    const salesValue = rspPerL != null ? roundMoney(rspPerL * litres) : null;
    const spread = fuelSpreadPerLitre(rspPerL, purchasePerL);
    const grossProfit = fuelMarginFromSpread(spread, litres);

    lines.push({
      invoiceNumber: invoice?.invoice_number || invoice?.sap_entry_number || "—",
      invoiceDate: date,
      fuel: stockProduct,
      fuelLabel: PRODUCT_LABELS[stockProduct],
      quantityLitres: litres,
      purchasePerL,
      rspPerL,
      purchaseValue: roundMoney(value),
      salesValue,
      grossProfit,
    });
  }

  lines.sort((a, b) => {
    const byDate = a.invoiceDate.localeCompare(b.invoiceDate);
    if (byDate !== 0) return byDate;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });

  return { lines };
}

function productFuelProfit(
  stockRow: StockPeriodSummary["ms"],
  invoiceLines: InvoiceProfitLineRow[],
  product: StockProduct
): ProductFuelProfit {
  const productLines = invoiceLines.filter((l) => l.fuel === product);
  const purchaseLitres = productLines.reduce((s, l) => s + l.quantityLitres, 0);
  const purchaseValue = productLines.reduce((s, l) => s + l.purchaseValue, 0);
  const retailWeighted = productLines.reduce(
    (s, l) => s + (l.rspPerL ?? 0) * l.quantityLitres,
    0
  );
  const retailLitres = productLines
    .filter((l) => l.rspPerL != null)
    .reduce((s, l) => s + l.quantityLitres, 0);

  const purchasePerL = weightedPerL(purchaseValue, purchaseLitres);
  const rspPerL = weightedPerL(retailWeighted, retailLitres);
  const sold = stockRow.impliedSalesLitres;

  if (sold == null || purchasePerL == null || rspPerL == null) {
    return {
      product,
      label: PRODUCT_LABELS[product],
      actualSoldLitres: sold,
      purchasePerL,
      rspPerL,
      purchaseCost: null,
      salesValue: null,
      grossProfit: null,
    };
  }

  const purchaseCost = roundMoney(purchasePerL * sold);
  const salesValue = roundMoney(rspPerL * sold);
  const grossProfit = roundMoney(salesValue - purchaseCost);

  return {
    product,
    label: PRODUCT_LABELS[product],
    actualSoldLitres: sold,
    purchasePerL,
    rspPerL,
    purchaseCost,
    salesValue,
    grossProfit,
  };
}

function isDealerMarginRow(row: PadTransactionRow): boolean {
  if (row.category === "MARGIN") return true;
  const text = `${row.item_text || ""} ${row.document_number || ""}`.toUpperCase();
  return row.category === "OTHER" && (text.includes("YVR464") || text.includes("DEALER MARGIN"));
}

function buildPadMoney(padTransactions: PadTransactionRow[], padCharges: PadChargeReport): PadMoneyReconciliation {
  const dealerCommission = roundMoney(
    padTransactions.filter(isDealerMarginRow).reduce((sum, row) => sum + row.credit, 0)
  );
  const discount = roundMoney(
    padTransactions
      .filter((row) => row.category === "DISCOUNT")
      .reduce((sum, row) => sum + row.credit, 0)
  );

  const padChargeLines = padCharges.byType.map((row) => ({
    label: row.name,
    amount: roundMoney(row.totalDebit),
  }));
  const interestFromCharges = roundMoney(
    padChargeLines
      .filter((line) => line.label.toLowerCase().includes("interest"))
      .reduce((sum, line) => sum + line.amount, 0)
  );
  const padDeductions = roundMoney(
    padChargeLines
      .filter((line) => !line.label.toLowerCase().includes("interest"))
      .reduce((sum, line) => sum + line.amount, 0)
  );
  const interestFromRows = roundMoney(
    padTransactions.filter((row) => row.category === "INTEREST").reduce((sum, row) => sum + row.debit, 0)
  );
  const otherPadCharges = interestFromCharges > 0 ? interestFromCharges : interestFromRows;
  const padChargesTotal = roundMoney(padDeductions + otherPadCharges);
  const netPadContribution = roundMoney(dealerCommission - padDeductions - otherPadCharges);

  return {
    dealerCommission,
    discount,
    padDeductions,
    otherPadCharges,
    padCharges: padChargeLines,
    padChargesTotal,
    otherDeductions: otherPadCharges,
    netPadContribution,
  };
}

function buildProfitAndLoss(input: {
  ms: ProductFuelProfit;
  hsd: ProductFuelProfit;
  totalFuelGrossProfit: number | null;
  pad: PadMoneyReconciliation;
  salaries: number;
  bankCharges: number;
  otherOperatingExpenses: number;
}): OutletProfitAndLoss {
  const totalFuelSales =
    input.ms.salesValue != null && input.hsd.salesValue != null
      ? roundMoney(input.ms.salesValue + input.hsd.salesValue)
      : null;
  const totalFuelCost =
    input.ms.purchaseCost != null && input.hsd.purchaseCost != null
      ? roundMoney(input.ms.purchaseCost + input.hsd.purchaseCost)
      : null;

  const otherOperatingIncome = input.pad.discount;
  let netProfit: number | null = null;
  if (input.totalFuelGrossProfit != null) {
    netProfit = roundMoney(
      input.totalFuelGrossProfit +
        input.pad.netPadContribution +
        otherOperatingIncome -
        input.salaries -
        input.bankCharges -
        input.otherOperatingExpenses
    );
  }

  const lines: ProfitLedgerLine[] = [
    moneyLine("MS Sales", input.ms.salesValue),
    moneyLine("HSD Sales", input.hsd.salesValue),
    moneyLine("Total Fuel Sales", totalFuelSales, "subtotal"),
    moneyLine("Cost of MS Sold", input.ms.purchaseCost, "deduction"),
    moneyLine("Cost of HSD Sold", input.hsd.purchaseCost, "deduction"),
    moneyLine("Total Fuel Cost", totalFuelCost, "subtotal"),
    moneyLine("Gross Fuel Profit", input.totalFuelGrossProfit, "subtotal"),
    moneyLine("Net PAD Contribution", input.pad.netPadContribution, "credit"),
    moneyLine("Other Operating Income", otherOperatingIncome, "credit"),
    moneyLine("Salaries", input.salaries > 0 ? input.salaries : null, "deduction"),
    moneyLine("Bank Charges", input.bankCharges, "deduction"),
    moneyLine("Other Operating Expenses", input.otherOperatingExpenses, "deduction"),
    moneyLine("Other Business Expenses", null, "deduction"),
    moneyLine("NET PROFIT / LOSS", netProfit, "total"),
  ];

  return {
    msSales: input.ms.salesValue,
    hsdSales: input.hsd.salesValue,
    totalFuelSales,
    costOfMsSold: input.ms.purchaseCost,
    costOfHsdSold: input.hsd.purchaseCost,
    totalFuelCost,
    grossFuelProfit: input.totalFuelGrossProfit,
    netPadContribution: input.pad.netPadContribution,
    otherOperatingIncome,
    salaries: input.salaries,
    bankCharges: input.bankCharges,
    otherOperatingExpenses: input.otherOperatingExpenses,
    otherBusinessExpenses: 0,
    netProfit,
    lines,
  };
}

function buildBankReconciliation(
  bank: ReturnType<typeof classifyBankForCa>,
  closingBankBalance: number,
  closingPadOutstanding: number
): BankCaReconciliation {
  const lines: ProfitLedgerLine[] = [
    moneyLine("Walk-in / same-day collections (cash, PhonePe, Paytm, cards, POS, small UPI)", bank.walkInReceipts, "credit"),
    moneyLine("Customer credit-sale collections (large UPI, NEFT, RTGS, IMPS, named transfers)", bank.creditSaleCollections, "credit"),
    moneyLine("IOCL payments", bank.ioclPayments, "deduction"),
    moneyLine("Other business payments", bank.otherBusinessPayments, "deduction"),
    moneyLine("Other credits (loans, family in, other)", bank.otherCredits, "credit"),
    moneyLine("Other debits (NACH EMIs and similar)", bank.otherDebits, "deduction"),
    moneyLine("Transfers between own / family accounts", bank.ownAccountTransfers, "deduction"),
    moneyLine("Closing bank balance", closingBankBalance, "subtotal"),
    moneyLine("Closing outstanding on PAD (payable to IOCL)", closingPadOutstanding, "subtotal"),
  ];

  return {
    walkInReceipts: bank.walkInReceipts,
    creditSaleCollections: bank.creditSaleCollections,
    ioclPayments: bank.ioclPayments,
    otherBusinessPayments: bank.otherBusinessPayments,
    otherCredits: bank.otherCredits,
    otherDebits: bank.otherDebits,
    ownAccountTransfers: bank.ownAccountTransfers,
    closingBankBalance: roundMoney(closingBankBalance),
    closingPadOutstanding: roundMoney(closingPadOutstanding),
    lines,
  };
}

export function computeFuelSalesReport(input: {
  stock: StockPeriodSummary;
  dateFrom: string;
  dateTo: string;
  allowedMonths?: string[];
  invoices: InvoiceHeader[];
  lineItems: InvoiceFuelLine[];
  retailPrices: RetailPriceRow[];
  padTransactions: PadTransactionRow[];
  padCharges: PadChargeReport;
  bankTransactions: BankTransactionRow[];
  bankSummary: BankExecutiveSummary;
  padClosingBalance: number;
}): FuelSalesReport {
  const { lines } = buildInvoiceProfitLines(input.invoices, input.lineItems, input.retailPrices);
  const stockReconciliation = buildStockReconciliation(input.stock);

  const msProfit = productFuelProfit(input.stock.ms, lines, "MS");
  const hsdProfit = productFuelProfit(input.stock.hsd, lines, "HSD");
  const totalFuelGrossProfit =
    msProfit.grossProfit != null && hsdProfit.grossProfit != null
      ? roundMoney(msProfit.grossProfit + hsdProfit.grossProfit)
      : null;

  const totalProduct: ProductFuelProfit = {
    product: "TOTAL",
    label: "Total",
    actualSoldLitres: input.stock.totalImpliedSalesLitres,
    purchasePerL: null,
    rspPerL: null,
    purchaseCost:
      msProfit.purchaseCost != null && hsdProfit.purchaseCost != null
        ? roundMoney(msProfit.purchaseCost + hsdProfit.purchaseCost)
        : null,
    salesValue:
      msProfit.salesValue != null && hsdProfit.salesValue != null
        ? roundMoney(msProfit.salesValue + hsdProfit.salesValue)
        : null,
    grossProfit: totalFuelGrossProfit,
  };

  const padMoney = buildPadMoney(input.padTransactions, input.padCharges);
  const bank = classifyBankForCa(input.bankTransactions);
  const profitAndLoss = buildProfitAndLoss({
    ms: msProfit,
    hsd: hsdProfit,
    totalFuelGrossProfit,
    pad: padMoney,
    salaries: bank.salaries,
    bankCharges: bank.bankCharges,
    otherOperatingExpenses: Math.max(0, bank.otherOperatingExpenses),
  });

  const ownerNotes = [
    "Fuel sold is from tank stock (opening + purchases − closing), not from bank credits.",
    "Pump sales are valued at retail selling price. Fuel cost is IOCL invoice rate on litres actually sold.",
    "PAD dealer commission is extra IOCL credit — it is not the same as pump price minus invoice price.",
    "Large UPI / NEFT / RTGS / IMPS credits are treated as credit-customer collections, not same-day nozzle sales.",
    "Loan credits, family transfers and NACH EMIs are not treated as fuel profit or pump expenses.",
    "TDS notes on PAD are tax adjustments, not income. Fleet-card postings are a collection method already inside fuel sales.",
  ];
  if (bank.salaries === 0) {
    ownerNotes.push(
      "No salary payments were found in this bank account. Cash salaries paid from daily collections are not deducted here."
    );
  }

  return {
    stockReconciliation,
    invoiceLines: lines,
    fuelGrossProfit: [msProfit, hsdProfit, totalProduct],
    profitAndLoss,
    bankReconciliation: buildBankReconciliation(
      bank,
      input.bankSummary.closingBalance,
      input.padClosingBalance
    ),
    padMoney,
    ownerNotes,
    stockNote: input.stock.coverageNote,
  };
}
