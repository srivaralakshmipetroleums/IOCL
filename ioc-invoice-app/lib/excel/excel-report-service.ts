import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";
import { DASHBOARD_INVOICE_STATUSES } from "@/lib/dashboard/constants";
import { isFuelProduct, normalizeFuelProduct } from "@/lib/dashboard/fuel-products";
import {
  REPORT_COLUMNS,
  buildReportFilename,
  buildReportTitle,
  buildSheetName,
  formatExcelDate,
} from "@/lib/excel/report-format";
import {
  DATA_START_ROW,
  addStyledTotalRow,
  applyAutoFilter,
  applyReportColumnWidths,
  styleDataRow,
  styleHeaderRow,
  styleTitleRow,
} from "@/lib/excel/report-styles";

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  supplier?: string;
  product?: string;
}

export interface ReportResult {
  buffer: Buffer;
  filename: string;
}

export class ExcelReportService {
  async generateInvoiceReport(filters: ReportFilters = {}): Promise<ReportResult> {
    const supabase = await createServiceClient();

    let invoiceQuery = supabase
      .from("invoices")
      .select("id, invoice_date, supplier_name, invoice_number")
      .in("status", [...DASHBOARD_INVOICE_STATUSES]);

    if (filters.dateFrom) invoiceQuery = invoiceQuery.gte("invoice_date", filters.dateFrom);
    if (filters.dateTo) invoiceQuery = invoiceQuery.lte("invoice_date", filters.dateTo);
    if (filters.supplier) {
      invoiceQuery = invoiceQuery.ilike("supplier_name", `%${filters.supplier}%`);
    }

    const { data: invoices, error: invoiceError } = await invoiceQuery.order("invoice_date");
    if (invoiceError) throw new Error(invoiceError.message);

    const invoiceMap = new Map((invoices || []).map((invoice) => [invoice.id, invoice]));
    const invoiceIds = (invoices || []).map((invoice) => invoice.id);

    let lineItems: Array<{
      id: string;
      invoice_id: string;
      product: string | null;
      invoice_value: number | null;
      hsn_code: string | null;
      output_quantity: number | null;
      output_measure: string | null;
    }> = [];

    if (invoiceIds.length) {
      let lineItemQuery = supabase
        .from("invoice_line_items")
        .select("id, invoice_id, product, invoice_value, hsn_code, output_quantity, output_measure")
        .in("invoice_id", invoiceIds);

      if (filters.product) {
        lineItemQuery = lineItemQuery.ilike("product", `%${filters.product}%`);
      }

      const { data, error: lineItemError } = await lineItemQuery;
      if (lineItemError) throw new Error(lineItemError.message);
      lineItems = data || [];
    }

    const rows = lineItems
      .filter((item) => isFuelProduct(item.product))
      .map((item) => ({ item, invoice: invoiceMap.get(item.invoice_id)! }))
      .filter((row) => row.invoice)
      .sort((a, b) => {
        const byDate = (a.invoice.invoice_date || "").localeCompare(b.invoice.invoice_date || "");
        if (byDate !== 0) return byDate;

        const byBill = (a.invoice.invoice_number || "").localeCompare(b.invoice.invoice_number || "");
        if (byBill !== 0) return byBill;

        return (a.item.product || "").localeCompare(b.item.product || "");
      });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(buildSheetName(filters.dateFrom));

    sheet.getCell("A1").value = buildReportTitle(filters.dateFrom);
    styleTitleRow(sheet);

    sheet.addRow([...REPORT_COLUMNS]);
    styleHeaderRow(sheet, 2);

    let currentRow = DATA_START_ROW;
    rows.forEach(({ item, invoice }, index) => {
      sheet.addRow([
        invoice.invoice_date ? formatExcelDate(invoice.invoice_date) : "",
        invoice.supplier_name || "",
        invoice.invoice_number || "",
        normalizeFuelProduct(item.product) || item.product || "",
        item.invoice_value ?? 0,
        item.hsn_code || "",
        item.output_quantity ?? 0,
        item.output_measure || "",
      ]);
      styleDataRow(sheet, currentRow, index);
      currentRow += 1;
    });

    const dataEndRow = rows.length ? currentRow - 1 : DATA_START_ROW - 1;
    const totalRowNum = addStyledTotalRow(sheet, DATA_START_ROW, dataEndRow);

    applyReportColumnWidths(sheet);
    applyAutoFilter(sheet, totalRowNum);

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      filename: buildReportFilename(filters.dateFrom),
    };
  }
}

export const excelReportService = new ExcelReportService();

/** @deprecated Use REPORT_COLUMNS from report-format.ts */
export const COLUMNS = REPORT_COLUMNS;
