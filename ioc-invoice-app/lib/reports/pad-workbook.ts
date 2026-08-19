import ExcelJS from "exceljs";

export const PAD_REPORT_COLORS = {
  titleBg: "FF0D2137",
  headerBg: "FF1F4E79",
  altRowBg: "FFD6E4F0",
  totalBg: "FF2E75B6",
  border: "FFBFBFBF",
  white: "FFFFFFFF",
  credit: "FFC6EFCE",
  debit: "FFF8CBAD",
  matched: "FFC6EFCE",
  padOnly: "FFFFE699",
  invoiceOnly: "FFBDD7EE",
  mismatch: "FFF8CBAD",
  fuel: "FFFCE4D6",
  payment: "FFC6EFCE",
  margin: "FFDDEBF7",
  charge: "FFF8CBAD",
} as const;

export type PadColumnKind = "text" | "center" | "money" | "qty" | "qty3" | "rate" | "int";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: PAD_REPORT_COLORS.border } },
  left: { style: "thin", color: { argb: PAD_REPORT_COLORS.border } },
  bottom: { style: "thin", color: { argb: PAD_REPORT_COLORS.border } },
  right: { style: "thin", color: { argb: PAD_REPORT_COLORS.border } },
};

function applyFill(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

export function numberFormat(kind: PadColumnKind): string | undefined {
  if (kind === "money") return "#,##0.00";
  if (kind === "qty") return "#,##0";
  if (kind === "qty3") return "#,##0.000";
  if (kind === "rate") return "#,##0.00";
  if (kind === "int") return "#,##0";
  return undefined;
}

export function horizontalAlign(kind: PadColumnKind): ExcelJS.Alignment["horizontal"] {
  if (kind === "text") return "left";
  if (kind === "center") return "center";
  return "right";
}

export function createPadWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IOCL Invoice Automation";
  workbook.created = new Date();
  return workbook;
}

export function addPadSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  headers: string[],
  kinds: PadColumnKind[],
  widths: number[]
) {
  const sheet = workbook.addWorksheet(name.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 2 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
  });

  const lastCol = headers.length;
  sheet.mergeCells(1, 1, 1, lastCol);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13, color: { argb: PAD_REPORT_COLORS.white }, name: "Calibri" };
  applyFill(titleCell, PAD_REPORT_COLORS.titleBg);
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 28;

  const headerRow = sheet.addRow(headers);
  headerRow.height = 22;
  for (let column = 1; column <= lastCol; column++) {
    const cell = headerRow.getCell(column);
    cell.font = { bold: true, size: 10, color: { argb: PAD_REPORT_COLORS.white }, name: "Calibri" };
    applyFill(cell, PAD_REPORT_COLORS.headerBg);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  }

  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.headerFooter.oddFooter = "&LSri Varalakshmi Petroleums — PAD Account Report&RPage &P of &N";

  return { sheet, kinds, lastCol };
}

export function addPadDataRow(
  sheet: ExcelJS.Worksheet,
  values: Array<string | number | null>,
  kinds: PadColumnKind[],
  dataIndex: number,
  rowFill?: string
) {
  const row = sheet.addRow(values);
  const fill = rowFill ?? (dataIndex % 2 === 1 ? PAD_REPORT_COLORS.altRowBg : undefined);

  values.forEach((_, index) => {
    const cell = row.getCell(index + 1);
    const kind = kinds[index] ?? "text";
    cell.font = { size: 9, name: "Calibri" };
    if (fill) applyFill(cell, fill);
    cell.alignment = {
      horizontal: horizontalAlign(kind),
      vertical: "middle",
      wrapText: kind === "text",
    };
    cell.border = thinBorder;
    const fmt = numberFormat(kind);
    if (fmt) cell.numFmt = fmt;
  });

  return row.number;
}

export function addPadTotalRow(
  sheet: ExcelJS.Worksheet,
  labels: Array<string | number | null>,
  kinds: PadColumnKind[]
) {
  const row = sheet.addRow(labels);
  labels.forEach((_, index) => {
    const cell = row.getCell(index + 1);
    const kind = kinds[index] ?? "text";
    cell.font = { bold: true, size: 10, color: { argb: PAD_REPORT_COLORS.white }, name: "Calibri" };
    applyFill(cell, PAD_REPORT_COLORS.totalBg);
    cell.alignment = { horizontal: horizontalAlign(kind), vertical: "middle" };
    cell.border = thinBorder;
    const fmt = numberFormat(kind);
    if (fmt) cell.numFmt = fmt;
  });
  return row.number;
}

export function applyPadAutoFilter(sheet: ExcelJS.Worksheet, lastCol: number, lastRow: number) {
  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: lastRow, column: lastCol },
  };
}
