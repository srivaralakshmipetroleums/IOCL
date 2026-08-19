import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { formatExcelDate } from "@/lib/excel/report-format";
import {
  buildPadReportFilename,
  buildPadReportTitle,
  formatReportMonth,
} from "@/lib/reports/pad-report-format";
import type { PadReportDataset } from "@/lib/reports/load-pad-report";

const NAVY = rgb(13 / 255, 33 / 255, 55 / 255);
const HEADER = rgb(31 / 255, 78 / 255, 121 / 255);
const ALT = rgb(214 / 255, 228 / 255, 240 / 255);
const WHITE = rgb(1, 1, 1);
const TEXT = rgb(0.12, 0.16, 0.22);

const PAGE = { width: 841.89, height: 595.28, margin: 28 };

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return `Rs ${num(Number(value))}`;
}

function pdfSafe(value: string): string {
  return value.replace(/₹/g, "Rs ").replace(/[^\x20-\x7E]/g, " ");
}

function num(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export async function generatePadPdfReport(data: PadReportDataset) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const title = buildPadReportTitle(data.period.label, data.period.dateFrom, data.period.dateTo);

  let ctx = newPage(pdf, font, bold, title, data);

  ctx = drawSection(ctx, "1. Executive summary", [
    ["Dealer", `${data.dealerName} (${data.customerCode})`],
    ["Period", `${data.period.label}  (${data.period.dateFrom} to ${data.period.dateTo})`],
    ["Opening balance", money(data.summary.openingBalance)],
    ["Closing balance", money(data.summary.closingBalance)],
    ["Credits in", money(data.summary.totalCredits)],
    ["Debits out", money(data.summary.totalDebits)],
    ["SBI deposits", money(data.summary.moneyInvestedSbi)],
    ["Fleet card", money(data.summary.moneyInvestedFleet)],
    ["Fuel purchased", money(data.summary.fuelPurchaseValue)],
    ["MS / HSD KL", `${num(data.summary.fuelMsKl, 3)} / ${num(data.summary.fuelHsdKl, 3)}`],
    ["Retail revenue", money(data.summary.retailRevenue)],
    ["YVR464 dealer margin", money(data.summary.marginTotal)],
    ["Discounts", money(data.summary.discountTotal)],
    ["Charges", money(data.summary.feesTotal)],
    ["Gross profit", money(data.summary.grossPumpProfit)],
  ]);

  ctx = drawTable(ctx, "2. Month-wise P&L", ["Month", "MS KL", "HSD KL", "Fuel margin", "Dealer + disc.", "Charges", "Gross profit"], data.rateTrend.map((rate) => {
    const pnl = data.grossProfitByMonth.find((row) => row.month === rate.month);
    return [
      formatReportMonth(rate.month),
      num(rate.msKl, 1),
      num(rate.hsdKl, 1),
      money((pnl?.msProfit ?? 0) + (pnl?.hsdProfit ?? 0)),
      money((pnl?.dealerMargin ?? 0) + (pnl?.discount ?? 0)),
      money(pnl?.charges ?? 0),
      money(pnl?.netProfit ?? 0),
    ];
  }));

  ctx = drawTable(ctx, "3. Fuel purchases", ["Date", "Bill no", "Product", "KL", "Value", "Rs/L", "RSP", "Profit"], data.fuelLines.map((row) => [
    row.invoiceDate ? formatExcelDate(row.invoiceDate) : "",
    row.billNo,
    row.product,
    num(row.quantityKl, 3),
    money(row.invoiceValue),
    num(row.purchasePerL),
    num(row.rspPerL),
    money(row.lineProfit),
  ]));

  ctx = drawTable(ctx, "4. PAD ledger", ["Date", "Category", "Document / text", "Qty KL", "Debit", "Credit", "Balance"], data.transactions.map((row) => [
    row.transaction_date ? formatExcelDate(row.transaction_date) : "",
    row.category,
    (row.document_number || row.item_text).slice(0, 42),
    num(row.quantity, 3),
    money(row.debit),
    money(row.credit),
    money(row.balance),
  ]));

  ctx = drawTable(ctx, "5. Charges", ["Date", "Type", "Reference", "Amount"], data.charges.items.map((row) => [
    row.date ? formatExcelDate(row.date) : "",
    row.name,
    row.reference.slice(0, 48),
    money(row.amount),
  ]));

  ctx = drawTable(ctx, "6. Money in", ["Date", "Type", "Reference", "Credit"], data.moneyIn.map((row) => [
    row.date ? formatExcelDate(row.date) : "",
    row.type,
    row.reference.slice(0, 48),
    money(row.credit),
  ]));

  ctx = drawTable(
    ctx,
    `7. Reconciliation  (matched ${data.reconciliationSummary.matched}, PAD only ${data.reconciliationSummary.padOnly}, invoice only ${data.reconciliationSummary.invoiceOnly}, mismatch ${data.reconciliationSummary.mismatches})`,
    ["Status", "Billing doc", "PAD date", "PAD debit", "Invoice", "Invoice total", "Note"],
    data.reconciliation.map((row) => [
      row.status.replace(/_/g, " "),
      row.billingDoc || "",
      row.padDate ? formatExcelDate(row.padDate) : "",
      money(row.padDebit),
      row.invoiceNumber || "",
      money(row.invoiceTotal),
      (row.mismatchReason || "").slice(0, 36),
    ])
  );

  ctx = drawTable(ctx, "8. Retail prices used", ["Product", "Effective from", "Rs/L", "Notes"], data.retailPrices.map((row) => [
    row.product,
    formatExcelDate(row.effective_from.slice(0, 10)),
    num(row.price_per_litre),
    (row.notes || "").slice(0, 50),
  ]));

  const bytes = await pdf.save();
  return {
    buffer: Buffer.from(bytes),
    filename: buildPadReportFilename(data.period.label, "pdf"),
  };
}

interface DrawCtx {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  title: string;
  data: PadReportDataset;
  y: number;
}

function newPage(
  pdf: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  data: PadReportDataset
): DrawCtx {
  const page = pdf.addPage([PAGE.width, PAGE.height]);
  page.drawRectangle({ x: 0, y: PAGE.height - 36, width: PAGE.width, height: 36, color: NAVY });
  page.drawText(pdfSafe(title).slice(0, 110), {
    x: PAGE.margin,
    y: PAGE.height - 23,
    size: 10,
    font: bold,
    color: WHITE,
  });
  page.drawText(pdfSafe(`${data.dealerName}  •  ${data.customerCode}`), {
    x: PAGE.margin,
    y: 14,
    size: 8,
    font,
    color: TEXT,
  });
  page.drawText(`Page ${pdf.getPageCount()}`, {
    x: PAGE.width - PAGE.margin - 50,
    y: 14,
    size: 8,
    font,
    color: TEXT,
  });
  return { pdf, page, font, bold, title, data, y: PAGE.height - 48 };
}

function ensureSpace(ctx: DrawCtx, needed: number): DrawCtx {
  if (ctx.y - needed > 28) return ctx;
  return newPage(ctx.pdf, ctx.font, ctx.bold, ctx.title, ctx.data);
}

function drawSection(ctx: DrawCtx, heading: string, rows: Array<[string, string]>): DrawCtx {
  ctx = ensureSpace(ctx, 24 + rows.length * 14);
  ctx.page.drawText(pdfSafe(heading), { x: PAGE.margin, y: ctx.y, size: 11, font: ctx.bold, color: HEADER });
  ctx.y -= 16;
  for (const [label, value] of rows) {
    ctx = ensureSpace(ctx, 14);
    ctx.page.drawText(pdfSafe(label), { x: PAGE.margin, y: ctx.y, size: 8, font: ctx.bold, color: TEXT });
    ctx.page.drawText(pdfSafe(value), { x: 200, y: ctx.y, size: 8, font: ctx.font, color: TEXT });
    ctx.y -= 12;
  }
  ctx.y -= 8;
  return ctx;
}

function drawTable(ctx: DrawCtx, heading: string, headers: string[], rows: string[][]): DrawCtx {
  const colW = (PAGE.width - PAGE.margin * 2) / headers.length;
  ctx = ensureSpace(ctx, 40);
  ctx.page.drawText(pdfSafe(heading), { x: PAGE.margin, y: ctx.y, size: 11, font: ctx.bold, color: HEADER });
  ctx.y -= 16;

  const drawHeader = (c: DrawCtx) => {
    c.page.drawRectangle({
      x: PAGE.margin,
      y: c.y - 3,
      width: PAGE.width - PAGE.margin * 2,
      height: 14,
      color: HEADER,
    });
    headers.forEach((header, i) => {
      c.page.drawText(header, {
        x: PAGE.margin + 3 + i * colW,
        y: c.y,
        size: 7,
        font: c.bold,
        color: WHITE,
      });
    });
    c.y -= 14;
    return c;
  };

  ctx = drawHeader(ctx);

  rows.forEach((row, index) => {
    ctx = ensureSpace(ctx, 20);
    if (ctx.y > PAGE.height - 60 && index > 0 && ctx.y < 40) {
      // handled by ensureSpace
    }
    if (index > 0 && ctx.y < 40) {
      ctx = newPage(ctx.pdf, ctx.font, ctx.bold, ctx.title, ctx.data);
      ctx.page.drawText(heading + " (cont.)", {
        x: PAGE.margin,
        y: ctx.y,
        size: 10,
        font: ctx.bold,
        color: HEADER,
      });
      ctx.y -= 16;
      ctx = drawHeader(ctx);
    }
    if (index % 2 === 1) {
      ctx.page.drawRectangle({
        x: PAGE.margin,
        y: ctx.y - 3,
        width: PAGE.width - PAGE.margin * 2,
        height: 12,
        color: ALT,
      });
    }
    row.forEach((cell, i) => {
      ctx.page.drawText(pdfSafe((cell || "")).slice(0, Math.floor(colW / 4.2)), {
        x: PAGE.margin + 3 + i * colW,
        y: ctx.y,
        size: 7,
        font: ctx.font,
        color: TEXT,
      });
    });
    ctx.y -= 12;
  });

  ctx.y -= 10;
  return ctx;
}
