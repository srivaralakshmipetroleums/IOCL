import { formatExcelDate } from "@/lib/excel/report-format";
import { isCollectionCategory } from "@/lib/bank/report-metrics";
import {
  bankCategoryFill,
  bankCategoryLabel,
  bankReconFill,
  BANK_REPORT_FOOTER,
} from "@/lib/reports/bank-excel-colors";
import {
  buildBankReportFilename,
  buildBankReportTitle,
} from "@/lib/reports/bank-report-format";
import type { BankReportDataset } from "@/lib/reports/load-bank-report";
import { formatReportMonth } from "@/lib/reports/pad-report-format";
import {
  addPadDataRow,
  addPadSheet,
  addPadTotalRow,
  applyPadAutoFilter,
  createPadWorkbook,
  type PadColumnKind,
} from "@/lib/reports/pad-workbook";

function n(value: number | null | undefined): number {
  return Number(value) || 0;
}

export async function generateBankExcelReport(data: BankReportDataset) {
  const workbook = createPadWorkbook();
  const title = buildBankReportTitle(data.period.label, data.period.dateFrom, data.period.dateTo);
  const accountLine = [
    data.account.accountName,
    data.account.accountNumber ? `A/c ${data.account.accountNumber}` : null,
    data.account.ifsc ? `IFSC ${data.account.ifsc}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  addSummarySheet(workbook, data, title, accountLine);
  addCashFlowSheet(workbook, data, title);
  addCollectionsSheet(workbook, data, title);
  addLedgerSheet(workbook, data, title);
  addOutflowsSheet(workbook, data, title);
  addTransferChannelsSheet(workbook, data, title);
  addReconciliationSheet(workbook, data, title);

  for (const sheet of workbook.worksheets) {
    sheet.headerFooter.oddFooter = BANK_REPORT_FOOTER;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: buildBankReportFilename(data.period.label),
  };
}

function addSummarySheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string,
  accountLine: string
) {
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Summary",
    title,
    ["Metric", "Amount", "Notes"],
    ["text", "money", "text"],
    [38, 22, 58]
  );

  const fyNote = data.account.fyLabels.length ? data.account.fyLabels.join(", ") : "";
  const rows: Array<[string, string | number, string, PadColumnKind]> = [
    ["Account", accountLine, data.account.branch ?? "", "text"],
    ["Period", data.period.label, `${data.period.dateFrom} to ${data.period.dateTo}`, "text"],
    ["Financial year", fyNote, "", "text"],
    ["Generated", formatExcelDate(data.generatedAt.slice(0, 10)), "", "text"],
    ["Opening balance", n(data.summary.openingBalance), "Bank opening", "money"],
    ["Closing balance", n(data.summary.closingBalance), "Bank closing", "money"],
    ["Total credits in", n(data.summary.totalCredits), "", "money"],
    ["Total debits out", n(data.summary.totalDebits), "", "money"],
    ["Net movement", n(data.summary.netMovement), "Credits − debits", "money"],
    ["Transaction count", data.summary.transactionCount, "", "int"],
    ["Cash deposits", n(data.summary.cashDeposits), "CASH_DEPOSIT", "money"],
    ["PhonePe credits", n(data.summary.phonePe), "", "money"],
    ["Paytm credits", n(data.summary.paytm), "", "money"],
    ["Card settlements", n(data.summary.cardSettlements), "", "money"],
    ["POS card credits", n(data.summary.posCards), "", "money"],
    ["UPI in", n(data.summary.upiIn), "", "money"],
    ["Total collections", n(data.summary.totalCollections), "Cash + digital + IOCL credits + interest", "money"],
    ["IOCL payments (out)", n(data.summary.ioclPayments), "RTGS/NEFT to IOCL", "money"],
    ["IOCL credits (in)", n(data.summary.ioclCredits), "IOCL_CREDIT", "money"],
    ["Bank charges", n(data.summary.bankCharges), "", "money"],
    ["Salary paid", n(data.summary.salary), "", "money"],
    ["Net operating cash", n(data.summary.netOperatingCash), "Collections − IOCL − salary − charges", "money"],
    [
      "Missed wallet days",
      data.summary.missedWalletDays,
      "Days with credits but no PhonePe and/or Paytm",
      "int",
    ],
    [
      "PAD recon matched",
      data.reconciliationSummary.matched,
      `${data.reconciliationSummary.total} IOCL payment rows`,
      "int",
    ],
  ];

  rows.forEach((row, index) => {
    addPadDataRow(sheet, [row[0], row[1], row[2]], ["text", row[3], "text"], index);
  });
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addCashFlowSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string
) {
  const headers = [
    "Month",
    "Credits in",
    "Debits out",
    "Cash deposits",
    "Digital collections",
    "PhonePe",
    "Paytm",
    "Card settlements",
    "POS cards",
    "UPI in",
    "IOCL payments",
    "Bank charges",
    "Salary",
    "Net movement",
    "Closing balance",
  ];
  const kinds: PadColumnKind[] = [
    "center",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
    "money",
  ];
  const { sheet, lastCol } = addPadSheet(workbook, "Month Cash Flow", title, headers, kinds, [
    12, 14, 14, 14, 16, 14, 14, 16, 14, 14, 14, 14, 14, 14, 16,
  ]);

  const totals = {
    creditsIn: 0,
    debitsOut: 0,
    cashDeposits: 0,
    digitalCollections: 0,
    phonePe: 0,
    paytm: 0,
    cardSettlements: 0,
    posCards: 0,
    upiIn: 0,
    ioclPayments: 0,
    charges: 0,
    salary: 0,
    netMovement: 0,
  };

  data.cashFlow.forEach((row, index) => {
    totals.creditsIn += row.creditsIn;
    totals.debitsOut += row.debitsOut;
    totals.cashDeposits += row.cashDeposits;
    totals.digitalCollections += row.digitalCollections;
    totals.phonePe += row.phonePe;
    totals.paytm += row.paytm;
    totals.cardSettlements += row.cardSettlements;
    totals.posCards += row.posCards;
    totals.upiIn += row.upiIn;
    totals.ioclPayments += row.ioclPayments;
    totals.charges += row.charges;
    totals.salary += row.salary;
    totals.netMovement += row.netMovement;

    addPadDataRow(
      sheet,
      [
        formatReportMonth(row.month),
        row.creditsIn,
        row.debitsOut,
        row.cashDeposits,
        row.digitalCollections,
        row.phonePe,
        row.paytm,
        row.cardSettlements,
        row.posCards,
        row.upiIn,
        row.ioclPayments,
        row.charges,
        row.salary,
        row.netMovement,
        row.closingBalance,
      ],
      kinds,
      index
    );
  });

  addPadTotalRow(
    sheet,
    [
      "TOTAL",
      totals.creditsIn,
      totals.debitsOut,
      totals.cashDeposits,
      totals.digitalCollections,
      totals.phonePe,
      totals.paytm,
      totals.cardSettlements,
      totals.posCards,
      totals.upiIn,
      totals.ioclPayments,
      totals.charges,
      totals.salary,
      totals.netMovement,
      null,
    ],
    kinds
  );
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addCollectionsSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = ["center", "center", "text", "text", "center", "money"];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Collections",
    title,
    ["Date", "Category", "Description", "Reference no.", "Branch", "Credit (₹)"],
    kinds,
    [14, 18, 48, 24, 12, 16]
  );

  const rows = data.transactions
    .filter((row) => row.credit > 0 && isCollectionCategory(row.category))
    .sort((a, b) => a.txn_date.localeCompare(b.txn_date) || a.line_number - b.line_number);

  let total = 0;
  rows.forEach((row, index) => {
    total += row.credit;
    addPadDataRow(
      sheet,
      [
        formatExcelDate(row.txn_date),
        bankCategoryLabel(row.category),
        row.description,
        row.reference_no || "",
        row.branch_code || "",
        row.credit,
      ],
      kinds,
      index,
      bankCategoryFill(row.category)
    );
  });

  addPadTotalRow(sheet, ["TOTAL", "", "", "", "", total], kinds);
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addLedgerSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = [
    "center",
    "center",
    "int",
    "center",
    "text",
    "text",
    "center",
    "money",
    "money",
    "money",
  ];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Bank Ledger",
    title,
    [
      "Date",
      "Value date",
      "Line",
      "Category",
      "Description",
      "Reference no.",
      "Branch",
      "Debit (₹)",
      "Credit (₹)",
      "Balance (₹)",
    ],
    kinds,
    [12, 12, 8, 16, 44, 22, 10, 14, 14, 14]
  );

  let debit = 0;
  let credit = 0;
  data.transactions.forEach((row, index) => {
    debit += row.debit;
    credit += row.credit;
    addPadDataRow(
      sheet,
      [
        formatExcelDate(row.txn_date),
        row.value_date ? formatExcelDate(row.value_date) : "",
        row.line_number,
        bankCategoryLabel(row.category),
        row.description,
        row.reference_no || "",
        row.branch_code || "",
        row.debit,
        row.credit,
        row.balance,
      ],
      kinds,
      index,
      bankCategoryFill(row.category)
    );
  });

  addPadTotalRow(sheet, ["TOTAL", "", null, "", "", "", "", debit, credit, null], kinds);
  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}

function addOutflowsSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = ["center", "center", "text", "text", "money"];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Charges and Outflows",
    title,
    ["Date", "Type", "Description", "Reference", "Amount (₹)"],
    kinds,
    [14, 18, 48, 28, 16]
  );

  const outflowRows = data.transactions
    .filter(
      (row) =>
        row.debit > 0 &&
        (row.category === "BANK_CHARGE" ||
          row.category === "SALARY" ||
          row.category === "IOCL_PAYMENT")
    )
    .sort((a, b) => a.txn_date.localeCompare(b.txn_date) || a.line_number - b.line_number);

  let total = 0;
  outflowRows.forEach((row, index) => {
    total += row.debit;
    const type =
      row.category === "BANK_CHARGE"
        ? "Bank charge"
        : row.category === "SALARY"
          ? "Salary"
          : "IOCL payment";
    addPadDataRow(
      sheet,
      [
        formatExcelDate(row.txn_date),
        type,
        row.description,
        row.reference_no || "",
        row.debit,
      ],
      kinds,
      index,
      bankCategoryFill(row.category)
    );
  });

  addPadTotalRow(sheet, ["TOTAL", "", "", "", total], kinds);

  sheet.addRow([]);
  sheet.addRow(["Month-wise totals"]);
  data.outflowByMonth.forEach((row) => {
    addPadDataRow(
      sheet,
      [
        formatReportMonth(row.period),
        `Charges ${row.bankCharges.toFixed(2)} · Salary ${row.salary.toFixed(2)} · IOCL ${row.ioclPayments.toFixed(2)}`,
        "",
        "",
        row.total,
      ],
      kinds,
      0
    );
  });

  sheet.addRow([]);
  sheet.addRow(["Year-wise totals"]);
  data.outflowByYear.forEach((row) => {
    addPadDataRow(
      sheet,
      [
        row.period,
        `Charges ${row.bankCharges.toFixed(2)} · Salary ${row.salary.toFixed(2)} · IOCL ${row.ioclPayments.toFixed(2)}`,
        "",
        "",
        row.total,
      ],
      kinds,
      0
    );
  });

  applyPadAutoFilter(sheet, lastCol, 2 + Math.max(outflowRows.length, 1));
}

function addTransferChannelsSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = ["center", "text", "int", "money", "money"];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "Transfer Channels",
    title,
    ["Channel", "Party / beneficiary", "Count", "Debit (₹)", "Credit (₹)"],
    kinds,
    [16, 42, 10, 16, 16]
  );

  let rowIndex = 0;
  for (const channel of data.transferChannels) {
    if (!channel.count) continue;

    addPadDataRow(
      sheet,
      [channel.label, `${channel.count} transactions`, channel.count, channel.debit, channel.credit],
      kinds,
      rowIndex,
      "FFDDEBF7"
    );
    rowIndex += 1;

    for (const party of channel.parties) {
      addPadDataRow(
        sheet,
        ["", party.label, party.count, party.debit, party.credit],
        kinds,
        rowIndex
      );
      rowIndex += 1;
    }
  }

  applyPadAutoFilter(sheet, lastCol, Math.max(sheet.lastRow?.number ?? 2, 2));
}

function addReconciliationSheet(
  workbook: ReturnType<typeof createPadWorkbook>,
  data: BankReportDataset,
  title: string
) {
  const kinds: PadColumnKind[] = [
    "center",
    "center",
    "money",
    "text",
    "center",
    "money",
    "text",
    "money",
    "text",
  ];
  const { sheet, lastCol } = addPadSheet(
    workbook,
    "PAD Reconciliation",
    title,
    [
      "Status",
      "Bank date",
      "Bank debit (₹)",
      "Bank reference",
      "PAD date",
      "PAD credit (₹)",
      "PAD reference",
      "Difference (₹)",
      "Note",
    ],
    kinds,
    [16, 12, 16, 40, 12, 16, 40, 16, 36]
  );

  const summary = data.reconciliationSummary;
  addPadDataRow(
    sheet,
    [
      `Matched ${summary.matched} | Mismatch ${summary.amountMismatch} | Bank only ${summary.bankOnly} | PAD only ${summary.padOnly}`,
      "",
      summary.bankTotal,
      "",
      "",
      summary.padTotal,
      "",
      summary.bankTotal - summary.padTotal,
      "",
    ],
    kinds,
    0
  );

  data.reconciliation.forEach((row, index) => {
    addPadDataRow(
      sheet,
      [
        row.status.replace(/_/g, " "),
        row.bankDate ? formatExcelDate(row.bankDate) : "",
        row.bankAmount,
        row.bankRef || "",
        row.padDate ? formatExcelDate(row.padDate) : "",
        row.padAmount,
        row.padRef || "",
        row.difference,
        row.note || "",
      ],
      kinds,
      index,
      bankReconFill(row.status)
    );
  });

  applyPadAutoFilter(sheet, lastCol, sheet.lastRow?.number ?? 2);
}
