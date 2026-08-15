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

    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = buildReportTitle(filters.dateFrom);
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.font = { bold: true, size: 12 };

    sheet.addRow([...REPORT_COLUMNS]);
    const headerRow = sheet.getRow(2);
    headerRow.font = { bold: true };

    for (const { item, invoice } of rows) {
      sheet.addRow([
        invoice.invoice_date ? formatExcelDate(invoice.invoice_date) : "",
        invoice.supplier_name || "",
        invoice.invoice_number || "",
        normalizeFuelProduct(item.product) || item.product || "",
        item.invoice_value ?? "",
        item.hsn_code || "",
        item.output_quantity ?? "",
        item.output_measure || "",
      ]);
    }

    sheet.getColumn(1).width = 14;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 16;
    sheet.getColumn(4).width = 14;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 14;
    sheet.getColumn(7).width = 14;
    sheet.getColumn(8).width = 10;

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
