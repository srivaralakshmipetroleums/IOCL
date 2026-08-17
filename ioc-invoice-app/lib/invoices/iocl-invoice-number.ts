/** IOCL PAD / Excel BILL NO is the 10-digit SAP entry / billing document. */

export function looksLikeSapBillingNumber(value: string | null | undefined): boolean {
  return /^\d{10}$/.test((value || "").replace(/\s/g, ""));
}

export function digitsOnly(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

/** Canonical key for matching PAD billing docs to invoices (strips letters and leading zeros). */
export function sapBillingMatchKey(value: string | null | undefined): string | null {
  const digits = digitsOnly(value).replace(/^0+/, "");
  return digits.length >= 9 ? digits : null;
}

/**
 * IOCL standard invoice number is the SAP entry / billing document, not the
 * alphanumeric commercial document id printed on some PDFs (e.g. 20264438B025811).
 */
export function resolveIoclInvoiceNumber(
  invoiceNumber: string | null | undefined,
  sapEntryNumber: string | null | undefined
): string {
  const sap = (sapEntryNumber || "").replace(/\s/g, "").trim();
  const invoice = (invoiceNumber || "").replace(/\s/g, "").trim();

  if (looksLikeSapBillingNumber(sap)) return sap;
  if (looksLikeSapBillingNumber(invoice)) return invoice;
  if (sap) return sap;
  return invoice;
}
