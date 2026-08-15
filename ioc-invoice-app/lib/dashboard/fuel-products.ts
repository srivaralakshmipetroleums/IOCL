export const FUEL_PRODUCTS = ["EBMS", "HSD-BSVI"] as const;

export type FuelProduct = (typeof FUEL_PRODUCTS)[number];

/** Map invoice line item product names to EBMS or HSD-BSVI for dashboard fuel charts. */
export function normalizeFuelProduct(product: string | null | undefined): FuelProduct | null {
  if (!product) return null;

  const upper = product.trim().toUpperCase();
  if (upper === "EBMS" || upper.includes("EBMS")) return "EBMS";
  if (upper.includes("HSD")) return "HSD-BSVI";

  return null;
}

export function isFuelProduct(product: string | null | undefined): boolean {
  return normalizeFuelProduct(product) !== null;
}
