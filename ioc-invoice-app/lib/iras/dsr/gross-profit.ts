import { normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import {
  fuelMarginFromSpread,
  fuelSpreadPerLitre,
  roundRatePerLitre,
} from "@/lib/dashboard/format";
import { buildRetailPriceLookup } from "@/lib/pad/retail-price-lookup";
import type { RetailPriceRow } from "@/lib/pad/types";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";

export interface InvoiceFuelLineByDate {
  date: string;
  product: IrasDsrProduct;
  litres: number;
  value: number;
}

function dsrProductFromFuel(product: ReturnType<typeof normalizeFuelProduct>): IrasDsrProduct | null {
  if (product === "EBMS") return "MS";
  if (product === "HSD-BSVI") return "HSD";
  return null;
}

export function aggregateInvoiceFuelByDate(
  lines: Array<{
    invoice_date: string | null;
    product: string | null;
    output_quantity: number | null;
    invoice_value: number | null;
  }>
): Map<string, InvoiceFuelLineByDate> {
  const byKey = new Map<string, InvoiceFuelLineByDate>();

  for (const line of lines) {
    const date = line.invoice_date?.slice(0, 10);
    if (!date) continue;
    const fuel = normalizeFuelProduct(line.product);
    const product = dsrProductFromFuel(fuel);
    if (!product) continue;

    const litres = Number(line.output_quantity) || 0;
    const value = Number(line.invoice_value) || 0;
    if (litres <= 0 && value <= 0) continue;

    const key = `${date}::${product}`;
    const current = byKey.get(key) ?? { date, product, litres: 0, value: 0 };
    current.litres += litres;
    current.value += value;
    byKey.set(key, current);
  }

  return byKey;
}

export function purchaseRatePerLitre(line: InvoiceFuelLineByDate | undefined): number | null {
  if (!line || line.litres <= 0) return null;
  return roundRatePerLitre(line.value / line.litres);
}

/** Latest invoice purchase ₹/L on or before the given date for MS/HSD. */
export function buildPurchaseRateLookup(
  invoiceByDateProduct: Map<string, InvoiceFuelLineByDate>
): (product: IrasDsrProduct, date: string) => number | null {
  const byProduct = new Map<IrasDsrProduct, Array<{ date: string; rate: number }>>();

  for (const line of invoiceByDateProduct.values()) {
    const rate = purchaseRatePerLitre(line);
    if (rate == null || rate <= 0) continue;
    const list = byProduct.get(line.product) ?? [];
    list.push({ date: line.date, rate });
    byProduct.set(line.product, list);
  }

  for (const list of byProduct.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  return (product, date) => {
    const list = byProduct.get(product);
    if (!list?.length) return null;

    let last: number | null = null;
    for (const entry of list) {
      if (entry.date <= date) last = entry.rate;
      else break;
    }
    return last;
  };
}

export function computeDsrRowGrossProfit(
  row: Pick<DsrLedgerRow, "date" | "product" | "netTotalizerSales">,
  rspLookup: ReturnType<typeof buildRetailPriceLookup>,
  purchaseLookup: ReturnType<typeof buildPurchaseRateLookup>
): number | null {
  const litres = row.netTotalizerSales;
  if (litres == null || litres <= 0) return null;

  const rsp = rspLookup(row.product, row.date);
  const purchaseRate = purchaseLookup(row.product, row.date);
  const spread = fuelSpreadPerLitre(rsp, purchaseRate);
  return fuelMarginFromSpread(spread, litres);
}

export function attachGrossProfitToLedgerRows(
  rows: DsrLedgerRow[],
  retailPrices: RetailPriceRow[],
  invoiceByDateProduct: Map<string, InvoiceFuelLineByDate>
): DsrLedgerRow[] {
  const rspLookup = buildRetailPriceLookup(retailPrices);
  const purchaseLookup = buildPurchaseRateLookup(invoiceByDateProduct);
  return rows.map((row) => ({
    ...row,
    grossProfit: computeDsrRowGrossProfit(row, rspLookup, purchaseLookup),
  }));
}
