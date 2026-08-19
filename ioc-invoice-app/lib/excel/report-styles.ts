import type ExcelJS from "exceljs";

export const REPORT_COLORS = {
  titleBg: "FF0D2137",
  headerBg: "FF1F4E79",
  altRowBg: "FFD6E4F0",
  totalBg: "FF2E75B6",
  border: "FFBFBFBF",
  white: "FFFFFFFF",
} as const;

const COLUMN_COUNT = 8;
const DATA_START_ROW = 3;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: REPORT_COLORS.border } },
  left: { style: "thin", color: { argb: REPORT_COLORS.border } },
  bottom: { style: "thin", color: { argb: REPORT_COLORS.border } },
  right: { style: "thin", color: { argb: REPORT_COLORS.border } },
};

const DATA_COLUMN_STYLES: Array<{
  horizontal: ExcelJS.Alignment["horizontal"];
  wrapText?: boolean;
  numFmt?: string;
}> = [
  { horizontal: "center", wrapText: true, numFmt: "@" },
  { horizontal: "left", numFmt: "@" },
  { horizontal: "center", wrapText: true, numFmt: "@" },
  { horizontal: "center", wrapText: true, numFmt: "@" },
  { horizontal: "right", numFmt: "#,##0.00" },
  { horizontal: "center", wrapText: true, numFmt: "@" },
  { horizontal: "right", numFmt: "#,##0" },
  { horizontal: "center", wrapText: true, numFmt: "@" },
];

function applyFill(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

export function styleTitleRow(sheet: ExcelJS.Worksheet) {
  sheet.mergeCells("A1:H1");
  const cell = sheet.getCell("A1");
  cell.font = { bold: true, size: 16, color: { argb: REPORT_COLORS.white }, name: "Calibri" };
  applyFill(cell, REPORT_COLORS.titleBg);
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 32;
}

export function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number) {
  const row = sheet.getRow(rowNum);
  row.height = 30;

  for (let column = 1; column <= COLUMN_COUNT; column++) {
    const cell = row.getCell(column);
    cell.font = { bold: true, size: 12, color: { argb: REPORT_COLORS.white }, name: "Calibri" };
    applyFill(cell, REPORT_COLORS.headerBg);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  }
}

export function styleDataRow(sheet: ExcelJS.Worksheet, rowNum: number, dataIndex: number) {
  const isAlt = dataIndex % 2 === 1;
  const row = sheet.getRow(rowNum);
  row.height = 24;

  for (let column = 1; column <= COLUMN_COUNT; column++) {
    const cell = row.getCell(column);
    const columnStyle = DATA_COLUMN_STYLES[column - 1];

    cell.font = { size: 11, name: "Calibri" };
    if (isAlt) applyFill(cell, REPORT_COLORS.altRowBg);
    cell.alignment = {
      horizontal: columnStyle.horizontal,
      vertical: "middle",
      wrapText: columnStyle.wrapText,
    };
    cell.border = thinBorder;
    if (columnStyle.numFmt) cell.numFmt = columnStyle.numFmt;
  }
}

export function addStyledTotalRow(
  sheet: ExcelJS.Worksheet,
  dataStartRow: number,
  dataEndRow: number
): number {
  const totalRowNum = dataEndRow >= dataStartRow ? dataEndRow + 1 : DATA_START_ROW;
  const row = sheet.getRow(totalRowNum);
  row.height = 24;
  row.getCell(1).value = "TOTAL";

  const valueCell = row.getCell(5);
  const quantityCell = row.getCell(7);

  if (dataEndRow >= dataStartRow) {
    valueCell.value = { formula: `SUM(E${dataStartRow}:E${dataEndRow})` };
    quantityCell.value = { formula: `SUM(G${dataStartRow}:G${dataEndRow})` };
  } else {
    valueCell.value = 0;
    quantityCell.value = 0;
  }

  for (let column = 1; column <= COLUMN_COUNT; column++) {
    const cell = row.getCell(column);
    cell.font = { bold: true, size: 11, color: { argb: REPORT_COLORS.white }, name: "Calibri" };
    applyFill(cell, REPORT_COLORS.totalBg);
    cell.border = thinBorder;

    if (column === 1) {
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    } else if (column === 5) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "#,##0.00";
    } else if (column === 7) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "#,##0";
    } else {
      cell.alignment = { horizontal: "right", vertical: "middle" };
    }
  }

  return totalRowNum;
}

export function applyReportColumnWidths(sheet: ExcelJS.Worksheet) {
  const widths = [14, 30, 16, 14, 18, 14, 14, 10];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

export function applyAutoFilter(sheet: ExcelJS.Worksheet, lastRow: number) {
  sheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: lastRow, column: COLUMN_COUNT },
  };
}

export { DATA_START_ROW };
