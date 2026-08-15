import type { GmailInvoiceConfig } from "./gmail-config";

export function isoToGmailDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}/${month}/${day}`;
}

export function buildGmailAfterDate(year: number, month: number): string {
  return `${year}/${String(month).padStart(2, "0")}/01`;
}

export function buildGmailBeforeDate(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}/${String(nextMonth).padStart(2, "0")}/01`;
}

function buildBaseQueryParts(
  config: Pick<GmailInvoiceConfig, "sender" | "subject" | "requireAttachment">
): string[] {
  const parts = [`from:${config.sender}`, `subject:"${config.subject}"`];

  if (config.requireAttachment) {
    parts.push("has:attachment");
  }

  return parts;
}

export function buildGmailSearchQuery(
  year: number,
  month: number,
  config: Pick<GmailInvoiceConfig, "sender" | "subject" | "requireAttachment">
): string {
  const parts = buildBaseQueryParts(config);
  parts.push(`after:${buildGmailAfterDate(year, month)}`);
  parts.push(`before:${buildGmailBeforeDate(year, month)}`);
  return parts.join(" ");
}

/** Build Gmail query for an inclusive ISO date range (YYYY-MM-DD). */
export function buildGmailSearchQueryForRange(
  dateFrom: string,
  dateToInclusive: string,
  config: Pick<GmailInvoiceConfig, "sender" | "subject" | "requireAttachment">
): string {
  const parts = buildBaseQueryParts(config);
  parts.push(`after:${isoToGmailDate(dateFrom)}`);

  const [year, month, day] = dateToInclusive.split("-").map(Number);
  const nextDay = new Date(year, month - 1, day + 1);
  const beforeDate = `${nextDay.getFullYear()}/${String(nextDay.getMonth() + 1).padStart(2, "0")}/${String(nextDay.getDate()).padStart(2, "0")}`;
  parts.push(`before:${beforeDate}`);

  return parts.join(" ");
}
