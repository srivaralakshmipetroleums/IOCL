import type { BankTransactionCategory } from "@/lib/bank/categorize";

function normalize(text: string): string {
  return text.toUpperCase().replace(/\s+/g, " ").trim();
}

export function cleanTransferPartyLabel(raw: string): string {
  let label = raw.replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  label = label.replace(/\bLIMI\b$/i, "Limited");
  label = label.replace(/\bLIMI$/i, "Limited");
  label = label.replace(/\bCHOLAMANDALA\s+M\b/i, "Cholamandalam");
  label = label.replace(/\bPRIVATE\s+LIM\b/i, "Private Limited");
  label = label.replace(/\s+\/$/, "");
  return label;
}

const PARTY_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /TARUNI\s+AGENC/i, label: "Taruni Agencies" },
  { pattern: /GUDAPAREDDY\s+BHASKAR|BHASKARA\s+REDDY\s+GU/i, label: "Gudapareddy Bhaskar Reddy" },
  { pattern: /GUDAPAREDDY\s+SREEN/i, label: "Gudapareddy Sreenivas" },
  { pattern: /THIRUMALA\s+CONSTR/i, label: "Thirumala Constructions" },
  { pattern: /CHOLAMANDAL/i, label: "Cholamandalam" },
  { pattern: /MERCHANT_DI\s+SBURS|MERCHANT\s+DISBURS/i, label: "Merchant disbursement" },
  { pattern: /NYRR\s+INFRA/i, label: "NYRR Infra Private Limited" },
  { pattern: /BAJAJ\s+FINANCE/i, label: "Bajaj Finance Ltd" },
  { pattern: /UPPALURU\s+BAYAPARE/i, label: "Uppaluru Bayapareddy" },
  { pattern: /PALLENENI\s+BHAKTHA/i, label: "Palleneni Bhaktha" },
];

export function canonicalTransferPartyLabel(label: string): string {
  const cleaned = cleanTransferPartyLabel(label);
  for (const alias of PARTY_ALIASES) {
    if (alias.pattern.test(cleaned)) return alias.label;
  }
  return cleaned;
}

export function normalizeTransferPartyKey(label: string): string {
  return normalize(canonicalTransferPartyLabel(label)).replace(/[^\w\s]/g, "").trim();
}

function extractPersonName(text: string): string | null {
  const mr = text.match(/(?:Mr\.|Mrs\.)\s+[A-Z][A-Z\s]+/i);
  if (mr) return cleanTransferPartyLabel(mr[0]);

  const payee = text.match(
    /(?:Utility\s+Bills-|Invoice\/Bill\s+\d+\s*-?)\s*\d+\s+([A-Za-z][A-Za-z\s]+?)(?:\s*\/|$)/i
  );
  if (payee?.[1]) return cleanTransferPartyLabel(payee[1]);

  const trailingName = text.match(/\d{8,}\s+([A-Za-z][A-Za-z\s]{4,}?)(?:\s*\/|$)/i);
  if (trailingName?.[1] && /[A-Za-z]{2,}/i.test(trailingName[1])) {
    return cleanTransferPartyLabel(trailingName[1]);
  }

  return null;
}

function extractFromReference(referenceNo: string | null | undefined): string | null {
  if (!referenceNo?.trim()) return null;
  const ref = referenceNo.trim();

  const transferTo = ref.match(/TRANSFER\s+TO\s+\d+\s+(.+?)(?:\s*\/|$)/i);
  if (transferTo?.[1]) return canonicalTransferPartyLabel(transferTo[1]);

  const transferFrom = ref.match(/TRANSFER\s+FROM\s+\d+\s+(.+?)(?:\s*\/|$)/i);
  if (transferFrom?.[1]) return canonicalTransferPartyLabel(transferFrom[1]);

  const person = extractPersonName(ref);
  if (person) return canonicalTransferPartyLabel(person);

  if (ref.length <= 80) return canonicalTransferPartyLabel(ref);
  return null;
}

function extractFromDescription(
  description: string,
  category: BankTransactionCategory
): string | null {
  const text = description.trim();
  const upper = normalize(text);

  if (category === "NACH_ACH") {
    if (/BAJAJ\s+FINANCE/i.test(text)) return "Bajaj Finance Ltd";
    if (/CHOLAMANDAL/i.test(text)) return "Cholamandalam";
    if (/HDFC\s+BANK/i.test(text)) return "HDFC Bank Limited";

    const mandate = text.match(/MANDATE\s+DEBIT\s+(.+?)(?:\s*-\s*DD)?-?-?$/i);
    if (mandate?.[1]) return canonicalTransferPartyLabel(mandate[1]);

    const ach = text.match(/ACHDR?\s+[\d\s/]+\s+([A-Z][A-Z\s]+?)-?-?$/i);
    if (ach?.[1]) return canonicalTransferPartyLabel(ach[1]);
  }

  if (category === "RTGS") {
    const rtgsTail = text.match(/--\s*([A-Z0-9][A-Z0-9\s.&]+)$/i);
    if (rtgsTail?.[1]?.trim()) return canonicalTransferPartyLabel(rtgsTail[1]);
    if (/UTR\s+NO:/i.test(text)) return "RTGS settlement";
  }

  if (category === "NEFT") {
    if (/TARUNI\s+AGENC/i.test(text)) return "Taruni Agencies";

    const neftTail = text.match(/--\s*([A-Z][A-Z0-9\s.&]+)$/i);
    if (neftTail?.[1]) return canonicalTransferPartyLabel(neftTail[1]);

    const transferTo = text.match(/TRANSFER\s+TO\s+([A-Z][A-Z0-9\s.&]+?)(?:\s+\d|\s*\/|$)/i);
    if (transferTo?.[1]) return canonicalTransferPartyLabel(transferTo[1]);

    const parts = text.split("*");
    if (parts.length >= 2) {
      const last = parts[parts.length - 1].replace(/--+$/g, "").trim();
      if (last && !/^\d+$/.test(last)) return canonicalTransferPartyLabel(last);
    }

    if (/INCORRECT\s+ACCOUNT/i.test(text)) return "Incorrect account (return)";
  }

  if (category === "IMPS") {
    const body = text.replace(/^BY\s+TRANSFER-IMPS\/?/i, "");
    const parts = body.split("/").map((part) => part.replace(/--+$/g, "").trim());
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i];
      if (!part || /^\d+$/.test(part)) continue;
      if (/^[A-Z]{2,4}-XX\d+/i.test(part)) continue;
      if (/[A-Za-z]{2,}/.test(part)) return canonicalTransferPartyLabel(part);
    }
  }

  if (category === "CHEQUE") {
    const person = extractPersonName(text);
    if (person) return canonicalTransferPartyLabel(person);

    if (/CHEQUE\s+DEPOSIT/i.test(text)) return "Cheque deposit";
    if (/CHEQUE\s+WDL|CHEQUE\s+TRANSFER/i.test(text)) return "Cheque withdrawal";
    if (/CHQ\s+TRANSFER/i.test(text)) {
      const chq = text.match(/TRANSFER-\s*\/\s*\d+\s+([A-Z][A-Z\s]+?)\s+2766/i);
      if (chq?.[1]) return canonicalTransferPartyLabel(chq[1]);
      return "Cheque transfer";
    }
    if (/CLEARING/i.test(text)) return "Cheque clearing";
    if (/RETURN/i.test(text)) return "Cheque return";
    return "Cheque";
  }

  if (category === "TRANSFER") {
    if (/PAYMENT\s+TO\s+UTILITY\s+BILLS/i.test(text)) {
      const person = extractPersonName(text);
      if (person) return canonicalTransferPartyLabel(person);
      return "Payment to utility bills";
    }

    const transferFrom = text.match(
      /TRANSFER\s+FROM\s+\d+\s+(.+?)(?:\s*\/|$)|TRANSFER\s+FROM-\s+(.+?)(?:\s*\/|$)/i
    );
    if (transferFrom) {
      const name = transferFrom[1] || transferFrom[2];
      if (name) return canonicalTransferPartyLabel(name);
    }

    const inb = text.match(/TO\s+TRANSFER-INB\s+(.+?)-?-?$/i);
    if (inb?.[1]) return canonicalTransferPartyLabel(inb[1]);

    const person = extractPersonName(text);
    if (person) return canonicalTransferPartyLabel(person);

    if (/BY\s+TRANSFER-TRANSFER\s+FROM/i.test(text)) return "Transfer from";
    if (/TO\s+TRANSFER-INB--/i.test(text)) return "INB transfer";
    if (/POOLING\s+AC\s+INB\s+RBI/i.test(text)) return "RBI pooling account";
  }

  if (category === "OTHER") {
    if (/KEEPING\s+CHGS|A\/C\s+KEEPING/i.test(text)) return "Account keeping charges";
  }

  const person = extractPersonName(text);
  if (person) return canonicalTransferPartyLabel(person);

  const stripped = text
    .replace(/^(BY|TO)\s+TRANSFER[-/]?\s*/i, "")
    .replace(/--+$/g, "")
    .trim();
  if (stripped.length > 0 && stripped.length <= 80) return canonicalTransferPartyLabel(stripped);

  return null;
}

/** Counterparty or purpose label for transfer-channel ledger rows. */
export function extractTransferPartyName(
  description: string,
  category: BankTransactionCategory,
  referenceNo?: string | null
): string {
  const trimmedDescription = description.trim();
  const genericDescription =
    /^(TO\s+TRANSFER-INB\s+Payment\s+to\s+Utility\s+Bills--|TO\s+TRANSFER-INB--|BY\s+TRANSFER-TRANSFER\s+FROM--)$/i.test(
      trimmedDescription
    );

  if (genericDescription) {
    const fromReference = extractFromReference(referenceNo);
    if (fromReference) return fromReference;
  }

  const fromDescription = extractFromDescription(trimmedDescription, category);
  if (fromDescription) return fromDescription;

  const fromReference = extractFromReference(referenceNo);
  if (fromReference) return fromReference;

  const combined = `${trimmedDescription} ${referenceNo ?? ""}`.trim();
  if (combined !== trimmedDescription) {
    const fromCombined = extractFromDescription(combined, category);
    if (fromCombined) return fromCombined;
    const person = extractPersonName(combined);
    if (person) return canonicalTransferPartyLabel(person);
  }

  return "Unspecified";
}
