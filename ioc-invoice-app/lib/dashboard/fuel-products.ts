export const FUEL_PRODUCTS = ["EBMS", "HSD-BSVI"] as const;

export type FuelProduct = (typeof FUEL_PRODUCTS)[number];

/**
 * Motor spirit (EBMS) — older IOCL invoices may use MS with prefixes/suffixes
 * (e.g. "MS", "MS-BVI-E12") instead of "EBMS".
 */
function isMotorSpiritProduct(upper: string): boolean {
  if (upper === "MS") return true;
  if (upper.includes("MOTOR SPIRIT")) return true;
  if (upper.includes("ETH. BLN") || upper.includes("ETH BLN") || upper.includes("ETHANOL BL")) {
    return true;
  }
  // Standalone MS token, including older names like "10% ETH. BLN. MS BS VI"
  if (/(?:^|[\s\-_./])MS(?:[\s\-_./]|$)/.test(upper)) return true;
  return false;
}

/**
 * High-speed diesel — older invoices may use "HSD" with variant suffixes.
 */
function isHsdProduct(upper: string): boolean {
  if (upper === "HSD") return true;
  return upper.includes("HSD");
}

/** Map invoice line item product names to EBMS or HSD-BSVI for dashboard fuel charts. */
export function normalizeFuelProduct(product: string | null | undefined): FuelProduct | null {
  if (!product) return null;

  const upper = product.trim().toUpperCase();
  if (upper === "EBMS" || upper.includes("EBMS")) return "EBMS";
  if (isHsdProduct(upper)) return "HSD-BSVI";
  if (isMotorSpiritProduct(upper)) return "EBMS";

  return null;
}

export function isFuelProduct(product: string | null | undefined): boolean {
  return normalizeFuelProduct(product) !== null;
}
