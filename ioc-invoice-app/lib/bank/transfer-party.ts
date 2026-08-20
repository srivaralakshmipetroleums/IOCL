import type { BankTransactionCategory } from "@/lib/bank/categorize";

function norm(text: string): string {
  return text.toUpperCase().replace(/\s+/g, " ").trim();
}

export function cleanTransferPartyLabel(raw: string): string {
  let label = raw.replace(/-+/g, " ").replace(/\s+/g, " ").trim();
  label = label.replace(/\bLIMI\b$/i, "Limited");
  label = label.replace(/\bCHOLAMANDALA\s+M\b/i, "Cholamandalam");
  label = label.replace(/\bPRIVATE\s+LIM\b/i, "Private Limited");
  label = label.replace(/\s+\/$/, "");
  label = label.replace(/\s+\d{4,}$/, "");
  return label;
}

const PARTY_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /TARUNI\s+AGENC/i, label: "Taruni Agencies" },
  { pattern: /GUDAPAREDDY\s+BHASKAR|BHASKARA\s+REDDY\s+GU/i, label: "Gudapareddy Bhaskar Reddy" },
  { pattern: /GUDAPAREDDY\s+SREEN/i, label: "Gudapareddy Sreenivas" },
  { pattern: /GUDAPAREDDY\s+VENKA/i, label: "Gudapareddy Venkata" },
  { pattern: /GUDAPAREDDY\s+VIJA/i, label: "Gudapareddy Vijaya" },
  { pattern: /GUDAPAREDDY\s+MAHE/i, label: "Gudapareddy Mahesh" },
  { pattern: /G\s+TEJESWAR\s+REDDY|TEJESWAR\s+REDDY/i, label: "G Tejeswar Reddy" },
  { pattern: /THIRUMALA\s+CONSTR/i, label: "Thirumala Constructions" },
  { pattern: /CHOLAMANDAL/i, label: "Cholamandalam" },
  { pattern: /MERCHANT_DI\s+SBURS|MERCHANT\s+DISBURS/i, label: "Merchant disbursement" },
  { pattern: /NYRR\s+INFRA/i, label: "NYRR Infra Private Limited" },
  { pattern: /BAJAJ\s+FINANCE/i, label: "Bajaj Finance Ltd" },
  { pattern: /UPPALURU\s+BAYAPARE/i, label: "Uppaluru Bayapareddy" },
  { pattern: /PALLENENI\s+BHAKTHA/i, label: "Palleneni Bhaktha" },
  { pattern: /MALIKIREDDY/i, label: "Venkata Malikireddy" },
  { pattern: /GUDDETI\s+SUMALATHA|GUDDETI/i, label: "Guddeti Sumalatha" },
  { pattern: /BOGGU\s+NAGARJUNA/i, label: "Boggu Nagarjuna" },
  { pattern: /SVARALAKS|ILAHI\s+FR/i, label: "Sri Varalakshmi Petroleum" },
  { pattern: /MORUSU\s+VENKAT/i, label: "Morusu Venkataramana Reddy" },
  { pattern: /ANTHAPU\s+ESWAR/i, label: "Anthapu Eswar Reddy" },
  { pattern: /MALYALA\s+NARAYAN/i, label: "Malyala Narayanappa" },
  { pattern: /ANDHRA\s+PRADESH\s+T/i, label: "Andhra Pradesh Treasury" },
];

export function canonicalTransferPartyLabel(label: string): string {
  const cleaned = cleanTransferPartyLabel(label);
  for (const alias of PARTY_ALIASES) {
    if (alias.pattern.test(cleaned)) return alias.label;
  }
  return cleaned;
}

export function normalizeTransferPartyKey(label: string): string {
  return norm(canonicalTransferPartyLabel(label)).replace(/[^\w\s]/g, "").trim();
}

function isNoiseToken(token: string): boolean {
  const t = norm(token);
  if (!t || t.length < 2) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^(TRANSFER|FROM|TO|INB|UTR|NO|BY|NEFT|RTGS|IMPS|CHEQUE|DEPOSIT|WDL|CHQ|CLEARING|RETURN)$/i.test(t)) {
    return true;
  }
  if (/^[A-Z]{2,4}\d{5,}/.test(t)) return true;
  if (/^PUNBR|^SBINR|^BARBR|^YESBR|^ICIN|^UTIBR|^KKBKR/i.test(t)) return true;
  return false;
}

function labelFromAliasScan(text: string): string | null {
  for (const alias of PARTY_ALIASES) {
    if (alias.pattern.test(text)) return alias.label;
  }
  return null;
}

function extractPersonName(text: string): string | null {
  const mr = text.match(/(?:Mr\.|Mrs\.)\s+([A-Za-z][A-Za-z\s]+?)(?=\s*\/|\s+\d{4,}|$)/i);
  if (mr?.[1]) return cleanTransferPartyLabel(mr[0]);

  const payee = text.match(
    /(?:Utility\s+Bills-|Invoice\/Bill\s+\d+\s*-?|Payment\s+to\s+Utility\s+Bills-)\s*\d+\s+([A-Za-z][A-Za-z\s]+?)(?:\s*\/|$)/i
  );
  if (payee?.[1]) return cleanTransferPartyLabel(payee[1]);

  const transferToDash = text.match(/TRANSFER\s+TO-\s*(?:Mr\.|Mrs\.)?\s*([A-Za-z][A-Za-z\s]+?)(?:\s*\/|\s+\d)/i);
  if (transferToDash?.[1]) return cleanTransferPartyLabel(transferToDash[1]);

  const trailingName = text.match(/\d{8,}\s+([A-Za-z][A-Za-z\s]{3,}?)(?:\s*\/|\s+\d{4,}|$)/i);
  if (trailingName?.[1] && !isNoiseToken(trailingName[1])) {
    return cleanTransferPartyLabel(trailingName[1]);
  }

  return null;
}

function isWeakReference(referenceNo: string): boolean {
  const ref = referenceNo.trim();
  if (!ref || ref === "/") return true;
  if (/^TRANSFER\s+FROM\s+\d+\s*\/\s*$/i.test(ref)) return true;
  if (/^TRANSFER\s+TO\s+\d+\s*\/\s*\d*$/i.test(ref) && !/[A-Za-z]{4,}/.test(ref)) return true;
  return false;
}

function extractFromReference(referenceNo: string | null | undefined): string | null {
  if (!referenceNo?.trim() || isWeakReference(referenceNo)) return null;
  const ref = referenceNo.trim();

  const alias = labelFromAliasScan(ref);
  if (alias) return alias;

  const person = extractPersonName(ref);
  if (person) return canonicalTransferPartyLabel(person);

  const transferTo = ref.match(
    /TRANSFER\s+TO\s+\d+\s+([A-Za-z][A-Za-z\s]+?)(?:\s*\/\s*\d|\s*\/\s*$|$)/i
  );
  if (transferTo?.[1] && !isNoiseToken(transferTo[1])) {
    return canonicalTransferPartyLabel(transferTo[1]);
  }

  const transferFromSlash = ref.match(
    /TRANSFER\s+FROM\s+[\d\s]+\/\s*([A-Za-z][A-Za-z\s]+?)(?:\s*\/|$)/i
  );
  if (transferFromSlash?.[1]) return canonicalTransferPartyLabel(transferFromSlash[1]);

  const transferFrom = ref.match(/TRANSFER\s+FROM\s+\d+\s+(.+?)(?:\s*\/|$)/i);
  if (transferFrom?.[1] && /[A-Za-z]{3,}/.test(transferFrom[1])) {
    return canonicalTransferPartyLabel(transferFrom[1]);
  }

  const neftInb = ref.match(/TRANSFER\s+TO\s+\d+\s*\/\s*([A-Za-z][A-Za-z\s]+)/i);
  if (neftInb?.[1]) return canonicalTransferPartyLabel(neftInb[1]);

  return null;
}

function extractAfterDoubleDash(text: string): string | null {
  const tail = text.match(/--\s*([A-Za-z][A-Za-z0-9\s.&]+)$/i);
  if (tail?.[1]?.trim() && !isNoiseToken(tail[1])) {
    return canonicalTransferPartyLabel(tail[1]);
  }
  return null;
}

function extractNeftStarTail(text: string): string | null {
  const parts = text.split("*");
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1].replace(/--+$/g, "").trim();
  if (!last || /^\d+$/.test(last) || isNoiseToken(last)) return null;
  return canonicalTransferPartyLabel(last);
}

function extractRtgsPartyName(text: string): string | null {
  const fromRef = text.match(/TRANSFER\s+FROM\s+[\d\s]+\/\s*([A-Za-z][A-Za-z\s]+)/i);
  if (fromRef?.[1]) return canonicalTransferPartyLabel(fromRef[1]);

  const afterDash = text.match(/\d{5,}-\s*([A-Za-z][A-Za-z\s]{6,}?)\s*$/i);
  if (afterDash?.[1]) return canonicalTransferPartyLabel(afterDash[1]);

  const tail = extractAfterDoubleDash(text);
  if (tail) return tail;

  return null;
}

function extractImpsPartyName(text: string): string | null {
  const body = text.replace(/^BY\s+TRANSFER-IMPS\/?/i, "");
  const parts = body.split("/").map((part) => part.replace(/--+$/g, "").trim());
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (!part || /^\d+$/.test(part)) continue;
    if (/^[A-Z]{2,4}-XX\d+/i.test(part)) continue;
    if (/^ICI-/i.test(part)) continue;
    if (/[A-Za-z]{2,}/.test(part)) return canonicalTransferPartyLabel(part);
  }
  return null;
}

function isGenericDescription(description: string): boolean {
  const d = description.trim();
  return (
    /^(TO\s+TRANSFER-INB\s+Payment\s+to\s+Utility\s+Bills--|TO\s+TRANSFER-INB--|BY\s+TRANSFER-TRANSFER\s+FROM--)$/i.test(
      d
    ) ||
    /^CHEQUE\s+DEPOSIT-?-+?\d+$/i.test(d) ||
    /^CHEQUE\s+DEPOSIT---\d+$/i.test(d)
  );
}

function extractFromDescription(
  description: string,
  category: BankTransactionCategory
): string | null {
  const text = description.trim();
  const upper = norm(text);

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
    const rtgs = extractRtgsPartyName(text);
    if (rtgs) return rtgs;
  }

  if (category === "NEFT") {
    const alias = labelFromAliasScan(text);
    if (alias) return alias;
    const neftTail = extractAfterDoubleDash(text);
    if (neftTail) return neftTail;
    const transferTo = text.match(/TRANSFER\s+TO\s+([A-Za-z][A-Za-z0-9\s.&]+?)(?:\s+\d|\s*\/|$)/i);
    if (transferTo?.[1]) return canonicalTransferPartyLabel(transferTo[1]);
    const star = extractNeftStarTail(text);
    if (star) return star;
    if (/INCORRECT\s+ACCOUNT/i.test(text)) return "Incorrect account (return)";
  }

  if (category === "IMPS") {
    const imps = extractImpsPartyName(text);
    if (imps) return imps;
  }

  if (category === "CHEQUE") {
    const alias = labelFromAliasScan(text);
    if (alias) return alias;
    const person = extractPersonName(text);
    if (person) return canonicalTransferPartyLabel(person);
    if (/CHQ\s+TRANSFER/i.test(text)) {
      const chqName = labelFromAliasScan(text);
      if (chqName) return chqName;
    }
    if (/CHEQUE\s+DEPOSIT/i.test(text) && !/^CHEQUE\s+DEPOSIT-?-+?\d+$/i.test(text)) {
      const depPerson = extractPersonName(text);
      if (depPerson) return canonicalTransferPartyLabel(depPerson);
    }
    if (/CHEQUE\s+WDL|CHEQUE\s+TRANSFER/i.test(text)) {
      const wdlPerson = extractPersonName(text);
      if (wdlPerson) return canonicalTransferPartyLabel(wdlPerson);
      return "Cheque withdrawal";
    }
    if (/CLEARING/i.test(text)) return "Cheque clearing";
    if (/RETURN/i.test(text)) return "Cheque return";
    if (/^CHEQUE\s+DEPOSIT/i.test(text)) return null;
    return "Cheque";
  }

  if (category === "TRANSFER") {
    const alias = labelFromAliasScan(text);
    if (alias) return alias;
    const person = extractPersonName(text);
    if (person) return canonicalTransferPartyLabel(person);
    const transferFrom = text.match(/TRANSFER\s+FROM\s+\d+\s+(.+?)(?:\s*\/|$)/i);
    if (transferFrom?.[1] && /[A-Za-z]{3,}/.test(transferFrom[1])) {
      return canonicalTransferPartyLabel(transferFrom[1]);
    }
    if (/PAYMENT\s+TO\s+UTILITY\s+BILLS/i.test(text) && !person) return null;
    const inb = text.match(/TO\s+TRANSFER-INB\s+(.+?)-?-?$/i);
    if (inb?.[1] && !/^(Payment to Utility Bills)?$/i.test(inb[1].trim())) {
      return canonicalTransferPartyLabel(inb[1]);
    }
    if (/POOLING\s+AC\s+INB\s+RBI/i.test(text)) return "RBI pooling account";
    if (/TO\s+TRANSFER-INB--/i.test(text)) return null;
    if (/BY\s+TRANSFER-TRANSFER\s+FROM/i.test(text)) return null;
  }

  if (category === "OTHER") {
    if (/KEEPING\s+CHGS|A\/C\s+KEEPING/i.test(text)) return "Account keeping charges";
    if (/POS\s+COMMITMENT/i.test(text)) return "POS commitment charge";
  }

  const person = extractPersonName(text);
  if (person) return canonicalTransferPartyLabel(person);

  const star = extractNeftStarTail(text);
  if (star) return star;

  const tail = extractAfterDoubleDash(text);
  if (tail) return tail;

  return null;
}

/** Counterparty or purpose label for transfer-channel ledger rows. */
export function extractTransferPartyName(
  description: string,
  category: BankTransactionCategory,
  referenceNo?: string | null
): string {
  const trimmedDescription = description.trim();
  const combined = [trimmedDescription, referenceNo].filter(Boolean).join(" ").trim();

  const combinedAlias = labelFromAliasScan(combined);
  if (combinedAlias) return combinedAlias;

  if (isGenericDescription(trimmedDescription) || isWeakReference(referenceNo ?? "")) {
    const fromRef = extractFromReference(referenceNo);
    if (fromRef) return fromRef;
  }

  const fromDescription = extractFromDescription(trimmedDescription, category);
  if (fromDescription) return fromDescription;

  const fromReference = extractFromReference(referenceNo);
  if (fromReference) return fromReference;

  const combinedPerson = extractPersonName(combined);
  if (combinedPerson) return canonicalTransferPartyLabel(combinedPerson);

  const rtgs = extractRtgsPartyName(combined);
  if (rtgs) return rtgs;

  const star = extractNeftStarTail(combined);
  if (star) return star;

  const tail = extractAfterDoubleDash(combined);
  if (tail) return tail;

  return "Unspecified";
}
