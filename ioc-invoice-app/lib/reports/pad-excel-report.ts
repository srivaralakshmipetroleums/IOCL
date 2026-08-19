import { formatExcelDate } from "@/lib/excel/report-format";
import { chargeDisplayName } from "@/lib/pad/fee-classify";
import { fuelProductFromCategory } from "@/lib/pad/query-helpers";
import {
  addPadDataRow,
  addPadSheet,
  addPadTotalRow,
  applyPadAutoFilter,
  createPadWorkbook,
  PAD_REPORT_COLORS,
  type PadColumnKind,
} from "@/lib/reports/pad-workbook";
import {
  buildPadReportFilename,
  buildPadReportTitle,
  formatReportMonth,
} from "@/lib/reports/pad-report-format";
import { ledgerFillHint, type PadReportDataset } from "@/lib/reports/load-pad-report";

function n(value: number | null | undefined): number {
  return Number(value) || 0;
}

function fillForLedger(hint: ReturnType<typeof ledgerFillHint>): string | undefined {
  if (hint === "fuel") return PAD_REPORT_COLORS.fuel;
  if (hint === "payment") return PAD_REPORT_COLORS.payment;
  if (hint === "margin") return PAD_REPORT_COLORS.margin;
  if (hint === "charge") return PAD_REPORT_COLORS.charge;
  return undefined;
}

function fillForStatus(status: string): string {
  if (status === "MATCHED") return PAD_REPORT_COLORS.matched;
  if (status === "PAD_ONLY") return PAD_REPORT_COLORS.padOnly;
  if (status === "INVOICE_ONLY") return PAD_REPORT_COLORS.invoiceOnly;
  return PAD_REPORT_COLORS.mismatch;
}

export async function generatePadExcelReport(data: PadReportDataset) {
  const workbook = createPadWorkbook();
  const title = buildPadReportTitle(data.period.label, data.period.dateFrom, data.period.dateTo);
  const subtitle = `${data.dealerName} (${data.customerCode})`;

  addSummarySheet(workbook, data, title, subtitle);
  addMonthPnlSheet(workbook, data, title);
  addFuelSheet(workbook, data, title);
  addLedgerSheet(workbook, data, title);
  addChargesSheet(workbook, data, title);
  addMoneyInSheet(workbook, data, title);
  addReconciliationSheet(workbook, data, title);
  addRetailSheet(workbook, data, title);

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: buildPadReportFilename(data.period.label, "xlsx"),
  };
}

function addSummarySheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string,
  subtitle: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Summary",
    title,
    ["Metric", "Amount", "Notes"],
    ["text", "money", "text"],
    [36, 22, 58]
  );

  const rows: Array<[string, string | number, string, PadColumnKind]> = [
    ["Dealer", subtitle, "", "text"],
    ["Period", data.period.label, `${data.period.dateFrom} to ${data.period.dateTo}`, "text"],
    ["Generated", formatExcelDate(data.generatedAt.slice(0, 10)), "", "text"],
    ["Opening balance", n(data.summary.openingBalance), "PAD opening", "money"],
    ["Closing balance", n(data.summary.closingBalance), "PAD closing", "money"],
    ["Credits in", n(data.summary.totalCredits), "Payments + margin + discounts", "money"],
    ["Debits out", n(data.summary.totalDebits), "Fuel + charges", "money"],
    ["SBI deposits", n(data.summary.moneyInvestedSbi), "Bank collections", "money"],
    ["Fleet card", n(data.summary.moneyInvestedFleet), "Fleet-card postings", "money"],
    ["Fuel purchased", n(data.summary.fuelPurchaseValue), "PAD fuel debits", "money"],
    ["MS quantity (KL)", n(data.summary.fuelMsKl), "From invoices", "qty3"],
    ["HSD quantity (KL)", n(data.summary.fuelHsdKl), "From invoices", "qty3"],
    ["Retail revenue", n(data.summary.retailRevenue), "Invoice litres × RSP", "money"],
    ["YVR464 dealer margin", n(data.summary.marginTotal), "PAD margin credits", "money"],
    ["Discounts", n(data.summary.discountTotal), "PAD discount credits", "money"],
    ["Charges", n(data.summary.feesTotal), "Non-fuel PAD debits", "money"],
    ["Gross profit", n(data.summary.grossPumpProfit), "Fuel margin + dealer margin + discounts − charges", "money"],
    ["Reconciliation matched", data.reconciliationSummary.matched, `${data.reconciliationSummary.total} rows`, "qty"],
  ];

  rows.forEach((row, index) => {
    addPadDataRow(sheet, [row[0], row[1], row[2]], ["text", row[3], "text"], index);
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addMonthPnlSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const headers = [
    "Month",
    "MS KL",
    "HSD KL",
    "Total KL",
    "MS purchase ₹",
    "HSD purchase ₹",
    "MS ₹/L",
    "HSD ₹/L",
    "MS RSP",
    "HSD RSP",
    "MS spread",
    "HSD spread",
    "MS fuel margin",
    "HSD fuel margin",
    "Dealer margin",
    "Discount",
    "Charges",
    "Gross profit",
    "Credits in",
    "Debits out",
  ];
  const kinds: PadColumnKind[] = [
    "center",
    "qty3",
    "qty3",
    "qty3",
    "money",
    "money",
    "rate",
    "rate",
    "rate",
    "rate",
    "rate",
    "rate",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
  ];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Month PnL",
    title,
    headers,
    kinds,
    [12, 10, 10, 10, 16, 16, 12, 12, 12, 12, 12, 12, 16, 16, 16, 14, 14, 16, 14, 14]
  );

  const cashByMonth = new Map(data.cashFlow.map((row) => [row.month, row]));
  const pnlByMonth = new Map(data.grossProfitByMonth.map((row) => [row.month, row]));
  const totals = {
    msKl: 0,
    hsdKl: 0,
    msValue: 0,
    hsdValue: 0,
    msProfit: 0,
    hsdProfit: 0,
    dealer: 0,
    discount: 0,
    charges: 0,
    gross: 0,
    credits: 0,
    debits: 0,
  };

  data.rateTrend.forEach((rate, index) => {
    const pnl = pnlByMonth.get(rate.month);
    const cash = cashByMonth.get(rate.month);
    const msValue = (rate.msPurchasePerL ?? 0) * rate.msKl * 1000;
    const hsdValue = (rate.hsdPurchasePerL ?? 0) * rate.hsdKl * 1000;
    totals.msKl += rate.msKl;
    totals.hsdKl += rate.hsdKl;
    totals.msValue += msValue;
    totals.hsdValue += hsdValue;
    totals.msProfit += pnl?.msProfit ?? 0;
    totals.hsdProfit += pnl?.hsdProfit ?? 0;
    totals.dealer += pnl?.dealerMargin ?? 0;
    totals.discount += pnl?.discount ?? 0;
    totals.charges += pnl?.charges ?? 0;
    totals.gross += pnl?.netProfit ?? 0;
    totals.credits += cash?.creditsIn ?? 0;
    totals.debits += cash?.debitsOut ?? 0;

    addPadDataRow(
      sheet,
      [
        formatReportMonth(rate.month),
        rate.msKl,
        rate.hsdKl,
        rate.totalKl,
        msValue,
        hsdValue,
        rate.msPurchasePerL,
        rate.hsdPurchasePerL,
        rate.msRetailPerL,
        rate.hsdRetailPerL,
        rate.msSpreadPerL,
        rate.hsdSpreadPerL,
        pnl?.msProfit ?? 0,
        pnl?.hsdProfit ?? 0,
        pnl?.dealerMargin ?? 0,
        pnl?.discount ?? 0,
        pnl?.charges ?? 0,
        pnl?.netProfit ?? 0,
        cash?.creditsIn ?? 0,
        cash?.debitsOut ?? 0,
      ],
      kinds,
      index
    );
  });

  addPadTotalRow(
    sheet,
    [
      "TOTAL",
      totals.msKl,
      totals.hsdKl,
      totals.msKl + totals.hsdKl,
      totals.msValue,
      totals.hsdValue,
      null,
      null,
      null,
      null,
      null,
      null,
      totals.msProfit,
      totals.hsdProfit,
      totals.dealer,
      totals.discount,
      totals.charges,
      totals.gross,
      totals.credits,
      totals.debits,
    ],
    kinds
  );
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addFuelSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = [
    "center",
    "center",
    "center",
    "qty3",
    "qty",
    "money",
    "rate",
    "rate",
    "rate",
    "money",
    "center",
  ];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Fuel Purchases",
    title,
    [
      "Invoice date",
      "Billing doc",
      "Product",
      "Qty (KL)",
      "Qty (L)",
      "Invoice value (₹)",
      "Purchase ₹/L",
      "RSP ₹/L",
      "Spread ₹/L",
      "Line gross profit",
      "HSN",
    ],
    kinds,
    [14, 16, 14, 12, 12, 18, 14, 12, 12, 18, 12]
  );

  let value = 0;
  let profit = 0;
  let litres = 0;
  data.fuelLines.forEach((row, index) => {
    value += row.invoiceValue;
    profit += row.lineProfit ?? 0;
    litres += row.quantityL;
    addPadDataRow(
      sheet,
      [
        row.invoiceDate ? formatExcelDate(row.invoiceDate) : "",
        row.billNo,
        row.product,
        row.quantityKl,
        row.quantityL,
        row.invoiceValue,
        row.purchasePerL,
        row.rspPerL,
        row.spreadPerL,
        row.lineProfit,
        row.hsn,
      ],
      kinds,
      index
    );
  });

  addPadTotalRow(
    sheet,
    ["TOTAL", "", "", litres / 1000, litres, value, null, null, null, profit, ""],
    kinds
  );
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addLedgerSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = [
    "center",
    "int",
    "center",
    "text",
    "center",
    "text",
    "center",
    "text",
    "center",
    "qty3",
    "money",
    "money",
    "money",
  ];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "PAD Ledger",
    title,
    [
      "Date",
      "Line",
      "Plant",
      "Document type",
      "Document no.",
      "Item text",
      "Category",
      "Charge name",
      "Material",
      "Qty (KL)",
      "Debit (₹)",
      "Credit (₹)",
      "Balance (₹)",
    ],
    kinds,
    [12, 8, 10, 22, 16, 42, 14, 22, 12, 12, 16, 16, 16]
  );

  let debit = 0;
  let credit = 0;
  data.transactions.forEach((row, index) => {
    debit += row.debit;
    credit += row.credit;
    addPadDataRow(
      sheet,
      [
        row.transaction_date ? formatExcelDate(row.transaction_date) : "",
        row.line_number,
        row.plant || "",
        row.document_type || "",
        row.document_number || "",
        row.item_text,
        row.category,
        isChargeRowSafe(row) ? chargeDisplayName(row) : "",
        row.material_group || fuelProductFromCategory(row) || "",
        row.quantity,
        row.debit,
        row.credit,
        row.balance,
      ],
      kinds,
      index,
      fillForLedger(ledgerFillHint(row))
    );
  });

  addPadTotalRow(
    sheet,
    ["TOTAL", null, "", "", "", "", "", "", "", null, debit, credit, null],
    kinds
  );
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function isChargeRowSafe(row: PadReportDataset["transactions"][number]) {
  return ledgerFillHint(row) === "charge";
}

function addChargesSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = ["center", "text", "text", "money"];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Charges",
    title,
    ["Date", "Charge type", "Reference", "Amount (₹)"],
    kinds,
    [14, 28, 50, 16]
  );

  data.charges.items.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [
        row.date ? formatExcelDate(row.date) : "",
        row.name,
        row.reference,
        row.amount,
      ],
      kinds,
      index,
      PAD_REPORT_COLORS.charge
    );
  });

  addPadTotalRow(sheet, ["TOTAL", "", "", data.charges.periodTotal], kinds);

  sheet.addRow([]);
  sheet.addRow(["Month-wise totals"]);
  data.charges.byMonth.forEach((row) => {
    addPadDataRow(sheet, [formatReportMonth(row.period), "", "", row.total], kinds, 0);
  });

  sheet.addRow([]);
  sheet.addRow(["Year-wise totals"]);
  data.charges.byYear.forEach((row) => {
    addPadDataRow(sheet, [row.period, "", "", row.total], kinds, 0);
  });

  applyPadAutoFilter(sheet, lastCol, 2 + Math.max(data.charges.items.length, 1));
}

function addMoneyInSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = ["center", "text", "text", "money"];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Money In",
    title,
    ["Date", "Type", "Reference", "Credit (₹)"],
    kinds,
    [14, 20, 55, 18]
  );

  const total = data.moneyIn.reduce((sum, row) => sum + row.credit, 0);
  data.moneyIn.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [row.date ? formatExcelDate(row.date) : "", row.type, row.reference, row.credit],
      kinds,
      index,
      row.type.includes("margin") || row.type === "Discount"
        ? PAD_REPORT_COLORS.margin
        : PAD_REPORT_COLORS.payment
    );
  });
  addPadTotalRow(sheet, ["TOTAL", "", "", total], kinds);
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addReconciliationSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = [
    "center",
    "center",
    "center",
    "money",
    "qty3",
    "center",
    "center",
    "center",
    "money",
    "qty3",
    "money",
    "text",
  ];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Reconciliation",
    title,
    [
      "Status",
      "Billing doc",
      "PAD date",
      "PAD debit",
      "PAD qty (KL)",
      "Product",
      "Invoice no.",
      "Invoice date",
      "Invoice total",
      "Invoice qty (KL)",
      "Difference ₹",
      "Note",
    ],
    kinds,
    [16, 16, 12, 16, 14, 10, 16, 14, 16, 16, 16, 40]
  );

  addPadDataRow(
    sheet,
    [
      `Matched ${data.reconciliationSummary.matched}  |  PAD only ${data.reconciliationSummary.padOnly}  |  Invoice only ${data.reconciliationSummary.invoiceOnly}  |  Mismatch ${data.reconciliationSummary.mismatches}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    kinds,
    0
  );

  data.reconciliation.forEach((row, index) => {
    const padDebit = row.padDebit || 0;
    const invoiceTotal = row.invoiceTotal ?? 0;
    addPadDataRow(
      sheet,
      [
        row.status.replace(/_/g, " "),
        row.billingDoc || "",
        row.padDate ? formatExcelDate(row.padDate) : "",
        row.padDate ? padDebit : null,
        row.padQuantityKl,
        row.product || "",
        row.invoiceNumber || "",
        row.invoiceDate ? formatExcelDate(row.invoiceDate) : "",
        row.invoiceTotal,
        row.invoiceQuantityKl,
        row.invoiceTotal != null && row.padDate ? invoiceTotal - padDebit : null,
        row.mismatchReason || "",
      ],
      kinds,
      index,
      fillForStatus(row.status)
    );
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addRetailSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: PadReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = ["center", "center", "rate", "text", "center"];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Retail Prices",
    title,
    ["Product", "Effective from", "₹/L", "Notes", "Source"],
    kinds,
    [12, 16, 12, 55, 14]
  );

  data.retailPrices.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [
        row.product,
        formatExcelDate(row.effective_from.slice(0, 10)),
        row.price_per_litre,
        row.notes || "",
        row.source_type || "",
      ],
      kinds,
      index
    );
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}
