import { normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import { fuelSpreadPerLitre, roundMoney } from "@/lib/dashboard/format";
import type { RetailPriceRow } from "@/lib/pad/types";

export const DEFAULT_MIN_SPREAD_PER_LITRE = 0.5;

export interface RspChangeEvent {
  product: "MS" | "HSD";
  effectiveFrom: string;
  previousPrice: number;
  newPrice: number;
  priceChange: number;
  avgPurchasePerL: number | null;
  spreadBefore: number | null;
  spreadAfter: number | null;
  spreadDelta: number | null;
  belowThreshold: boolean;
  estimatedDailyImpact: number | null;
}

interface InvoiceFuelLine {
  invoice_date: string | null;
  product: string | null;
  invoice_value: number | null;
  output_quantity: number | null;
}

interface DayCloseLitres {
  business_date: string;
  msSaleLitres: number;
  hsdSaleLitres: number;
}

function avgPurchasePerL(
  lines: InvoiceFuelLine[],
  product: "MS" | "HSD",
  beforeDate: string,
  lookbackDays = 30
): number | null {
  const cutoff = new Date(beforeDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  let value = 0;
  let litres = 0;
  for (const line of lines) {
    const date = line.invoice_date?.slice(0, 10);
    if (!date || date >= beforeDate || date < cutoffIso) continue;
    const fuel = normalizeFuelProduct(line.product);
    const matches =
      (product === "MS" && fuel === "EBMS") || (product === "HSD" && fuel === "HSD-BSVI");
    if (!matches) continue;
    const qty = Number(line.output_quantity) || 0;
    if (qty <= 0) continue;
    value += Number(line.invoice_value) || 0;
    litres += qty;
  }
  return litres > 0 ? value / litres : null;
}

function avgDailyLitres(
  dayCloses: DayCloseLitres[],
  product: "MS" | "HSD",
  beforeDate: string,
  lookbackDays = 30
): number | null {
  const cutoff = new Date(beforeDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const rows = dayCloses.filter(
    (row) => row.business_date < beforeDate && row.business_date >= cutoffIso
  );
  if (!rows.length) return null;

  const total = rows.reduce(
    (sum, row) => sum + (product === "MS" ? row.msSaleLitres : row.hsdSaleLitres),
    0
  );
  return total / rows.length;
}

export function detectRspChanges(
  prices: RetailPriceRow[],
  invoiceLines: InvoiceFuelLine[],
  dayCloses: DayCloseLitres[],
  options?: { minSpreadPerLitre?: number; lookbackDays?: number }
): RspChangeEvent[] {
  const minSpread = options?.minSpreadPerLitre ?? DEFAULT_MIN_SPREAD_PER_LITRE;
  const lookbackDays = options?.lookbackDays ?? 30;
  const events: RspChangeEvent[] = [];

  for (const product of ["MS", "HSD"] as const) {
    const sorted = prices
      .filter((row) => row.product === product)
      .sort((a, b) => a.effective_from.localeCompare(b.effective_from));

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (previous.price_per_litre === current.price_per_litre) continue;

      const effectiveFrom = current.effective_from.slice(0, 10);
      const avgPurchase = avgPurchasePerL(invoiceLines, product, effectiveFrom, lookbackDays);
      const spreadBefore = fuelSpreadPerLitre(previous.price_per_litre, avgPurchase);
      const spreadAfter = fuelSpreadPerLitre(current.price_per_litre, avgPurchase);
      const spreadDelta =
        spreadBefore != null && spreadAfter != null
          ? roundMoney(spreadAfter - spreadBefore)
          : null;

      const avgLitres = avgDailyLitres(dayCloses, product, effectiveFrom, lookbackDays);
      const estimatedDailyImpact =
        spreadDelta != null && avgLitres != null
          ? roundMoney(spreadDelta * avgLitres)
          : null;

      events.push({
        product,
        effectiveFrom,
        previousPrice: previous.price_per_litre,
        newPrice: current.price_per_litre,
        priceChange: roundMoney(current.price_per_litre - previous.price_per_litre),
        avgPurchasePerL: avgPurchase != null ? roundMoney(avgPurchase) : null,
        spreadBefore,
        spreadAfter,
        spreadDelta,
        belowThreshold: spreadAfter != null ? spreadAfter < minSpread : false,
        estimatedDailyImpact,
      });
    }
  }

  return events.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}
