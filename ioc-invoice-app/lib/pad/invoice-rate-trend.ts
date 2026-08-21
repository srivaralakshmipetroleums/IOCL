import { isChargeRow } from "@/lib/pad/fee-classify";
import { normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import { fuelSpreadPerLitre, roundMoney } from "@/lib/dashboard/format";
import { monthKey } from "@/lib/pad/query-helpers";
import { buildRetailPriceLookup } from "@/lib/pad/retail-price-lookup";
import type { PadGrossProfitMonth, PadRateTrendPoint } from "@/lib/pad/metrics";
import type { PadTransactionRow, RetailPriceRow } from "@/lib/pad/types";

interface InvoiceHeader {
  id: string;
  invoice_date: string | null;
}

interface InvoiceFuelLine {
  invoice_id: string;
  product: string | null;
  invoice_value: number | null;
  output_quantity: number | null;
}

/**
 * Purchase ₹/L uses the invoice dashboard formula: fuel line value / litres,
 * split by MS (EBMS) and HSD. Retail ₹/L is the RSP effective on the 15th of the month.
 */
export function computeInvoiceMsHsdRateTrend(
  invoices: InvoiceHeader[],
  lineItems: InvoiceFuelLine[],
  retailPrices: RetailPriceRow[]
): PadRateTrendPoint[] {
  const lookup = buildRetailPriceLookup(retailPrices);
  const invoiceDate = new Map(
    invoices.map((invoice) => [invoice.id, invoice.invoice_date])
  );
  const map = new Map<
    string,
    { month: string; msValue: number; msLitres: number; hsdValue: number; hsdLitres: number }
  >();

  for (const item of lineItems) {
    const date = invoiceDate.get(item.invoice_id);
    const product = normalizeFuelProduct(item.product);
    if (!date || !product) continue;

    const month = date.slice(0, 7);
    const entry = map.get(month) ?? {
      month,
      msValue: 0,
      msLitres: 0,
      hsdValue: 0,
      hsdLitres: 0,
    };
    const value = Number(item.invoice_value) || 0;
    const litres = Number(item.output_quantity) || 0;
    if (product === "EBMS") {
      entry.msValue += value;
      entry.msLitres += litres;
    } else {
      entry.hsdValue += value;
      entry.hsdLitres += litres;
    }
    map.set(month, entry);
  }

  return [...map.values()]
    .map((entry) => {
      const msPurchasePerL = entry.msLitres ? entry.msValue / entry.msLitres : null;
      const hsdPurchasePerL = entry.hsdLitres ? entry.hsdValue / entry.hsdLitres : null;
      const msRetailPerL = lookup("MS", `${entry.month}-15`);
      const hsdRetailPerL = lookup("HSD", `${entry.month}-15`);
      const msKl = entry.msLitres / 1000;
      const hsdKl = entry.hsdLitres / 1000;
      return {
        month: entry.month,
        msPurchasePerL,
        hsdPurchasePerL,
        msRetailPerL,
        hsdRetailPerL,
        msSpreadPerL: fuelSpreadPerLitre(msRetailPerL, msPurchasePerL),
        hsdSpreadPerL: fuelSpreadPerLitre(hsdRetailPerL, hsdPurchasePerL),
        msKl,
        hsdKl,
        totalKl: msKl + hsdKl,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function invoiceRateTrendToFuelPurchases(
  trend: PadRateTrendPoint[]
): Array<{ month: string; msKl: number; hsdKl: number; msValue: number; hsdValue: number }> {
  return trend.map((row) => ({
    month: row.month,
    msKl: row.msKl,
    hsdKl: row.hsdKl,
    msValue: row.msPurchasePerL != null ? row.msPurchasePerL * row.msKl * 1000 : 0,
    hsdValue: row.hsdPurchasePerL != null ? row.hsdPurchasePerL * row.hsdKl * 1000 : 0,
  }));
}

export function computeInvoiceGrossProfitByMonth(
  rateTrend: PadRateTrendPoint[],
  transactions: PadTransactionRow[]
): PadGrossProfitMonth[] {
  const map = new Map<string, PadGrossProfitMonth>();

  function entry(month: string): PadGrossProfitMonth {
    const existing = map.get(month);
    if (existing) return existing;
    const created: PadGrossProfitMonth = {
      month,
      msProfit: 0,
      hsdProfit: 0,
      dealerMargin: 0,
      discount: 0,
      charges: 0,
      fuelProfit: 0,
      netProfit: 0,
    };
    map.set(month, created);
    return created;
  }

  for (const row of rateTrend) {
    const monthRow = entry(row.month);
    monthRow.msProfit = roundMoney((row.msSpreadPerL ?? 0) * row.msKl * 1000);
    monthRow.hsdProfit = roundMoney((row.hsdSpreadPerL ?? 0) * row.hsdKl * 1000);
  }

  for (const tx of transactions) {
    const month = monthKey(tx.transaction_date);
    if (!month) continue;
    const monthRow = entry(month);
    if (tx.category === "MARGIN") monthRow.dealerMargin += tx.credit;
    if (tx.category === "DISCOUNT") monthRow.discount += tx.credit;
    if (isChargeRow(tx)) monthRow.charges += tx.debit;
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      fuelProfit: row.msProfit + row.hsdProfit,
      netProfit: row.msProfit + row.hsdProfit + row.dealerMargin + row.discount - row.charges,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
