import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { OwnerPackDataset } from "@/lib/reports/load-owner-pack";

const NAVY = rgb(13 / 255, 33 / 255, 55 / 255);
const HEADER = rgb(31 / 255, 78 / 255, 121 / 255);
const TEXT = rgb(0.12, 0.16, 0.22);
const PAGE = { width: 595.28, height: 841.89, margin: 40 };

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `Rs ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function pdfSafe(value: string): string {
  return value.replace(/₹/g, "Rs ").replace(/[^\x20-\x7E]/g, " ");
}

function safeLabel(label: string): string {
  return label.replace(/[^\w\s-]/g, "").trim() || "Owner_Pack";
}

interface PageContext {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  title: string;
}

function newPage(ctx: PageContext): PageContext {
  const page = ctx.pdf.addPage([PAGE.width, PAGE.height]);
  page.drawText(pdfSafe(ctx.title), {
    x: PAGE.margin,
    y: PAGE.height - PAGE.margin,
    size: 11,
    font: ctx.bold,
    color: NAVY,
  });
  return { ...ctx, page, y: PAGE.height - PAGE.margin - 24 };
}

function ensureSpace(ctx: PageContext, needed = 60): PageContext {
  if (ctx.y - needed < PAGE.margin) return newPage(ctx);
  return ctx;
}

function drawSection(ctx: PageContext, heading: string, rows: Array<[string, string]>): PageContext {
  let next = ensureSpace(ctx, 40 + rows.length * 16);
  next.page.drawText(pdfSafe(heading), {
    x: PAGE.margin,
    y: next.y,
    size: 12,
    font: next.bold,
    color: HEADER,
  });
  next = { ...next, y: next.y - 18 };

  for (const [label, value] of rows) {
    next = ensureSpace(next, 20);
    next.page.drawText(pdfSafe(label), { x: PAGE.margin, y: next.y, size: 10, font: next.font, color: TEXT });
    next.page.drawText(pdfSafe(value), {
      x: PAGE.margin + 220,
      y: next.y,
      size: 10,
      font: next.bold,
      color: TEXT,
    });
    next = { ...next, y: next.y - 14 };
  }

  return { ...next, y: next.y - 10 };
}

export async function generateOwnerPackPdf(data: OwnerPackDataset) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const title = `Owner Pack — ${data.period.label}`;

  let ctx: PageContext = {
    pdf,
    page: pdf.addPage([PAGE.width, PAGE.height]),
    font,
    bold,
    y: PAGE.height - PAGE.margin,
    title,
  };

  ctx.page.drawText(pdfSafe(title), {
    x: PAGE.margin,
    y: ctx.y,
    size: 16,
    font: bold,
    color: NAVY,
  });
  ctx.y -= 22;
  ctx.page.drawText(pdfSafe(`${data.period.dateFrom} to ${data.period.dateTo}`), {
    x: PAGE.margin,
    y: ctx.y,
    size: 10,
    font,
    color: TEXT,
  });
  ctx.y -= 28;

  const pl = data.business.fuelSalesReport.profitAndLoss;
  ctx = drawSection(ctx, "Fuel profit and loss", [
    ["Net profit / loss", money(pl.netProfit)],
    ["Invoice purchases", money(data.business.invoice.totalValue)],
    ["Invoice count", String(data.business.invoice.invoiceCount)],
    ["MS purchases (L)", String(Math.round(data.business.invoice.msPurchasesLitres))],
    ["HSD purchases (L)", String(Math.round(data.business.invoice.hsdPurchasesLitres))],
  ]);

  ctx = drawSection(ctx, "PAD account", [
    ["Opening balance", money(data.pad.summary.openingBalance)],
    ["Closing balance", money(data.pad.summary.closingBalance)],
    ["Fuel purchased", money(data.pad.summary.fuelPurchaseValue)],
    ["Dealer margin", money(data.pad.summary.marginTotal)],
    ["Gross pump profit", money(data.pad.summary.grossPumpProfit)],
  ]);

  ctx = drawSection(ctx, "Bank collections", [
    ["Opening balance", money(data.bank.summary.openingBalance)],
    ["Closing balance", money(data.bank.summary.closingBalance)],
    ["Total collections", money(data.bank.summary.totalCollections)],
    ["PhonePe", money(data.bank.summary.phonePe)],
    ["Paytm", money(data.bank.summary.paytm)],
    ["POS cards", money(data.bank.summary.posCards)],
    ["IOCL payments out", money(data.bank.summary.ioclPayments)],
    ["Net operating cash", money(data.bank.summary.netOperatingCash)],
  ]);

  const dayCloseTotals = data.dayCloseSummaries.reduce(
    (acc, row) => ({
      msLitres: acc.msLitres + row.msSaleLitres,
      hsdLitres: acc.hsdLitres + row.hsdSaleLitres,
      msReceipts: acc.msReceipts + row.msTotalReceipts,
      hsdReceipts: acc.hsdReceipts + row.hsdTotalReceipts,
    }),
    { msLitres: 0, hsdLitres: 0, msReceipts: 0, hsdReceipts: 0 }
  );

  ctx = drawSection(ctx, "Day close summary", [
    ["Days saved", String(data.dayCloseSummaries.length)],
    ["Total MS sale (L)", String(Math.round(dayCloseTotals.msLitres))],
    ["Total HSD sale (L)", String(Math.round(dayCloseTotals.hsdLitres))],
    ["Total MS receipts", money(dayCloseTotals.msReceipts)],
    ["Total HSD receipts", money(dayCloseTotals.hsdReceipts)],
  ]);

  ctx = drawSection(ctx, "Reconciliation", [
    ["Bank vs PAD matched", String(data.business.reconciliation.bankPadIoclMatched)],
    ["Amount mismatches", String(data.business.reconciliation.bankPadIoclMismatch)],
    ["Bank only", String(data.business.reconciliation.bankPadIoclBankOnly)],
    ["PAD only", String(data.business.reconciliation.bankPadIoclPadOnly)],
    ["Invoice vs PAD diff (L)", data.business.reconciliation.invoiceVsPadKlDiff != null
      ? String(Math.round(data.business.reconciliation.invoiceVsPadKlDiff))
      : "—"],
    ["Total exceptions listed", String(data.reconciliationExceptions.length)],
  ]);

  if (data.reconciliationExceptions.length > 0) {
    ctx = ensureSpace(ctx, 30);
    ctx.page.drawText(pdfSafe("Top reconciliation exceptions"), {
      x: PAGE.margin,
      y: ctx.y,
      size: 12,
      font: bold,
      color: HEADER,
    });
    ctx = { ...ctx, y: ctx.y - 18 };

    for (const row of data.reconciliationExceptions.slice(0, 12)) {
      ctx = ensureSpace(ctx, 18);
      const line = `${row.source} | ${row.date ?? "—"} | ${row.status} | ${row.reference}`.slice(0, 90);
      ctx.page.drawText(pdfSafe(line), {
        x: PAGE.margin,
        y: ctx.y,
        size: 9,
        font,
        color: TEXT,
      });
      ctx = { ...ctx, y: ctx.y - 12 };
    }
  }

  const bytes = await pdf.save();
  const slug = safeLabel(data.period.label).replace(/\s+/g, "_");
  return {
    buffer: Buffer.from(bytes),
    filename: `Owner_Pack_Summary_${slug}.pdf`,
  };
}
