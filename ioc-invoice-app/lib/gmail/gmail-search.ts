import type { GmailInvoiceConfig } from "./gmail-config";

export function buildGmailAfterDate(year: number, month: number): string {
  return `${year}/${String(month).padStart(2, "0")}/01`;
}

export function buildGmailBeforeDate(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}/${String(nextMonth).padStart(2, "0")}/01`;
}

export function buildGmailSearchQuery(
  year: number,
  month: number,
  config: Pick<GmailInvoiceConfig, "sender" | "subject" | "requireAttachment">
): string {
  const parts = [
    `from:${config.sender}`,
    `subject:"${config.subject}"`,
  ];

  if (config.requireAttachment) {
    parts.push("has:attachment");
  }

  parts.push(`after:${buildGmailAfterDate(year, month)}`);
  parts.push(`before:${buildGmailBeforeDate(year, month)}`);

  return parts.join(" ");
}
