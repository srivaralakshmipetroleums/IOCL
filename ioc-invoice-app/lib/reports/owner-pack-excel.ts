import {
  addPadDataRow,
  addPadSheet,
  applyPadAutoFilter,
  createPadWorkbook,
  type PadColumnKind,
} from "@/lib/reports/pad-workbook";
import type { OwnerPackDataset } from "@/lib/reports/load-owner-pack";

function n(value: number | null | undefined): number {
  return Number(value) || 0;
}

function safeLabel(label: string): string {
  return label.replace(/[^\w\s-]/g, "").trim() || "Owner_Pack";
}

export async function generateOwnerPackExcel(data: OwnerPackDataset) {
  const workbook = createPadWorkbook();
  const title = `Owner Pack — ${data.period.label}`;
  const subtitle = `${data.period.dateFrom} to ${data.period.dateTo}`;

  addSummarySheet(workbook, data, title, subtitle);
  addFuelPlSheet(workbook, data, title);
  addPadSummarySheet(workbook, data, title);
  addBankSheet(workbook, data, title);
  addInvoiceSheet(workbook, data, title);
  addDayCloseSheet(workbook, data, title);
  addExceptionsSheet(workbook, data, title);

  const buffer = await workbook.xlsx.writeBuffer();
  const slug = safeLabel(data.period.label).replace(/\s+/g, "_");
  return {
    buffer: Buffer.from(buffer),
    filename: `Owner_Pack_${slug}.xlsx`,
  };
}

function addSummarySheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string,
  subtitle: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Summary",
    title,
    ["Metric", "Value", "Notes"],
    ["text", "money", "text"],
    [40, 22, 50]
  );

  const pl = data.business.fuelSalesReport.profitAndLoss;
  const rows: Array<[string, string | number, string, PadColumnKind]> = [
    ["Period", subtitle, data.period.label, "text"],
    ["Generated", data.generatedAt.slice(0, 10), "", "text"],
    ["Net profit / loss", n(pl.netProfit), "Fuel outlet P&L", "money"],
    ["Invoice purchases", n(data.business.invoice.totalValue), `${data.business.invoice.invoiceCount} invoices`, "money"],
    ["PAD closing balance", n(data.business.pad.closingBalance), "", "money"],
    ["Bank closing balance", n(data.business.bank.closingBalance), "", "money"],
    ["Bank collections", n(data.business.bank.totalCollections), "", "money"],
    ["Day closes saved", data.dayCloseSummaries.length, "Days with day account", "qty"],
    ["Reconciliation exceptions", data.reconciliationExceptions.length, "PAD + Bank", "qty"],
  ];

  rows.forEach((row, index) => {
    addPadDataRow(sheet, [row[0], row[1], row[2]], ["text", row[3], "text"], index);
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addFuelPlSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Fuel P and L",
    title,
    ["Particular", "Amount"],
    ["text", "money"],
    [48, 22]
  );

  data.business.fuelSalesReport.profitAndLoss.lines.forEach((line, index) => {
    addPadDataRow(sheet, [line.label, n(line.amount)], ["text", "money"], index);
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addPadSummarySheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "PAD Summary",
    title,
    ["Metric", "Amount", "Notes"],
    ["text", "money", "text"],
    [36, 22, 40]
  );

  const s = data.pad.summary;
  const rows: Array<[string, number, string]> = [
    ["Opening balance", n(s.openingBalance), ""],
    ["Closing balance", n(s.closingBalance), ""],
    ["Credits in", n(s.totalCredits), ""],
    ["Debits out", n(s.totalDebits), ""],
    ["Fuel purchased", n(s.fuelPurchaseValue), ""],
    ["MS quantity (KL)", n(s.fuelMsKl), ""],
    ["HSD quantity (KL)", n(s.fuelHsdKl), ""],
    ["Dealer margin", n(s.marginTotal), ""],
    ["Discounts", n(s.discountTotal), ""],
    ["Charges", n(s.feesTotal), ""],
    ["Gross profit", n(s.grossPumpProfit), ""],
  ];

  rows.forEach((row, index) => {
    addPadDataRow(sheet, row, ["text", "money", "text"], index);
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addBankSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Bank Collections",
    title,
    ["Metric", "Amount", "Notes"],
    ["text", "money", "text"],
    [36, 22, 40]
  );

  const s = data.bank.summary;
  const rows: Array<[string, number, string]> = [
    ["Opening balance", n(s.openingBalance), ""],
    ["Closing balance", n(s.closingBalance), ""],
    ["Total collections", n(s.totalCollections), "Cash + digital + IOCL"],
    ["PhonePe", n(s.phonePe), ""],
    ["Paytm", n(s.paytm), ""],
    ["POS card credits", n(s.posCards), ""],
    ["IOCL credits", n(s.ioclCredits), ""],
    ["IOCL payments (out)", n(s.ioclPayments), ""],
    ["Net operating cash", n(s.netOperatingCash), ""],
  ];

  rows.forEach((row, index) => {
    addPadDataRow(sheet, row, ["text", "money", "text"], index);
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addInvoiceSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Invoice Purchases",
    title,
    ["Date", "Bill No", "Product", "Qty (L)", "Value", "Purchase/L", "RSP/L", "Spread/L"],
    ["text", "text", "text", "qty", "money", "rate", "rate", "rate"],
    [12, 16, 12, 14, 16, 12, 12, 12]
  );

  data.pad.fuelLines.forEach((line, index) => {
    addPadDataRow(
      sheet,
      [
        line.invoiceDate,
        line.billNo,
        line.product,
        n(line.quantityL),
        n(line.invoiceValue),
        line.purchasePerL,
        line.rspPerL,
        line.spreadPerL,
      ],
      ["text", "text", "text", "qty", "money", "rate", "rate", "rate"],
      index
    );
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addDayCloseSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Day Close",
    title,
    [
      "Date",
      "MS sale (L)",
      "HSD sale (L)",
      "MS net (Rs)",
      "HSD net (Rs)",
      "MS receipts",
      "HSD receipts",
      "MS matched",
      "HSD matched",
      "MS diff",
      "HSD diff",
      "MS pump boy",
      "HSD pump boy",
    ],
    ["text", "qty3", "qty3", "money", "money", "money", "money", "text", "text", "money", "money", "text", "text"],
    [12, 12, 12, 14, 14, 14, 14, 10, 10, 12, 12, 14, 14]
  );

  data.dayCloseSummaries.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [
        row.businessDate,
        row.msSaleLitres,
        row.hsdSaleLitres,
        row.msNetValue,
        row.hsdNetValue,
        row.msTotalReceipts,
        row.hsdTotalReceipts,
        row.msMatched ? "Yes" : "No",
        row.hsdMatched ? "Yes" : "No",
        row.msDifference,
        row.hsdDifference,
        row.msPumpBoy ?? "",
        row.hsdPumpBoy ?? "",
      ],
      ["text", "qty3", "qty3", "money", "money", "money", "money", "text", "text", "money", "money", "text", "text"],
      index
    );
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addExceptionsSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: OwnerPackDataset,
  title: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Exceptions",
    title,
    ["Source", "Date", "Reference", "Status", "Amount", "Details"],
    ["text", "text", "text", "text", "money", "text"],
    [18, 12, 20, 16, 14, 40]
  );

  data.reconciliationExceptions.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [row.source, row.date ?? "", row.reference, row.status, row.amount, row.details],
      ["text", "text", "text", "text", "money", "text"],
      index
    );
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}
