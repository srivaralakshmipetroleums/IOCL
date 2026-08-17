export interface ParsedRspPrice {
  product: "MS" | "HSD";
  pricePerLitre: number;
  label: string;
}

export interface ParsedRspEmail {
  customerName: string;
  customerCode: string;
  effectiveFrom: string;
  effectiveTime: string | null;
  prices: ParsedRspPrice[];
}

function parseDdMmYyyy(value: string): string | null {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function normalizeCustomerCode(code: string): string {
  return code.replace(/\D/g, "").replace(/^0+/, "") || "0";
}

function mapProductLabel(label: string): "MS" | "HSD" | null {
  const upper = label.trim().toUpperCase();
  if (upper.includes("PETROL") || upper === "MS" || upper.includes("MOTOR SPIRIT")) {
    return "MS";
  }
  if (upper.includes("DIESEL") || upper === "HSD") {
    return "HSD";
  }
  return null;
}

/** Strip IOCL disclaimer footer and normalize whitespace. */
export function normalizeRspEmailText(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .split(/(?:Disclaimer|अस्वीकरण)/i)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrices(normalized: string): ParsedRspPrice[] {
  const prices: ParsedRspPrice[] = [];
  const pricePattern = /Rs\.?\s*([\d.]+)\s*\/\s*L\s+for\s+([^,.]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = pricePattern.exec(normalized)) !== null) {
    const pricePerLitre = Number(match[1]);
    const label = match[2].trim();
    const product = mapProductLabel(label);
    if (!product || !Number.isFinite(pricePerLitre) || pricePerLitre <= 0) continue;
    prices.push({ product, pricePerLitre, label });
  }

  return prices;
}

/** Parse IOCL IDPCS retail selling price change email body. */
export function parseRspEmailBody(
  body: string,
  expectedCustomerCode = "330042"
): ParsedRspEmail | null {
  const normalized = normalizeRspEmailText(body);

  const headerMatch = normalized.match(
    /Price at (.+?)\s*\(\s*(\d+)\s*\)\s+on\s+(\d{2}-\d{2}-\d{4})\s+wef\s+(\d{1,2}:\d{2}\s*Hrs)?\s*is\b/i
  );

  if (!headerMatch) return null;

  const customerName = headerMatch[1].trim();
  const customerCode = normalizeCustomerCode(headerMatch[2]);
  const effectiveFrom = parseDdMmYyyy(headerMatch[3]);
  const effectiveTime = headerMatch[4]?.trim() ?? null;

  if (
    expectedCustomerCode &&
    customerCode !== normalizeCustomerCode(expectedCustomerCode)
  ) {
    return null;
  }

  const prices = extractPrices(normalized);
  if (!effectiveFrom || !prices.length) return null;

  return {
    customerName,
    customerCode,
    effectiveFrom,
    effectiveTime,
    prices,
  };
}

/** Extract effective date from subject like "Price change wef 21.06.2020 wef 06:00 Hrs". */
export function parseRspSubjectDate(subject: string): string | null {
  const match = subject.match(/wef\s+(\d{2})\.(\d{2})\.(\d{4})/i);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** Try body parse, optionally patching date from subject line. */
export function parseRspEmail(
  body: string,
  subject: string,
  expectedCustomerCode = "330042"
): ParsedRspEmail | null {
  let parsed = parseRspEmailBody(body, expectedCustomerCode);
  if (parsed) return parsed;

  const subjectDate = parseRspSubjectDate(subject);
  if (!subjectDate) return null;

  const [year, month, day] = subjectDate.split("-");
  const ddMmYyyy = `${day}-${month}-${year}`;
  return parseRspEmailBody(
    body.replace(/on\s+\d{2}-\d{2}-\d{4}/i, `on ${ddMmYyyy}`),
    expectedCustomerCode
  );
}
