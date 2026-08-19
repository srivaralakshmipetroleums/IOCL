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
import { fetchAllPages, fetchByIdsInChunks } from "@/lib/supabase/fetch-all";

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
    const dateFrom = filters.dateFrom?.trim() || undefined;
    const dateTo = filters.dateTo?.trim() || undefined;
    const supplier = filters.supplier?.trim() || undefined;
    const product = filters.product?.trim() || undefined;

    const invoices = await fetchAllPages(async (from, to) => {
      let query = supabase
        .from("invoices")
        .select("id, invoice_date, supplier_name, invoice_number")
        .in("status", [...DASHBOARD_INVOICE_STATUSES])
        .order("invoice_date")
        .order("id")
        .range(from, to);

      if (dateFrom) query = query.gte("invoice_date", dateFrom);
      if (dateTo) query = query.lte("invoice_date", dateTo);
      if (supplier) query = query.ilike("supplier_name", `%${supplier}%`);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    });

    const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    const invoiceIds = invoices.map((invoice) => invoice.id);

    const rawLineItems = invoiceIds.length
      ? await fetchByIdsInChunks(invoiceIds, (chunk) =>
          fetchAllPages(async (from, to) => {
            const { data, error } = await supabase
              .from("invoice_line_items")
              .select("id, invoice_id, product, invoice_value, hsn_code, output_quantity, output_measure")
              .in("invoice_id", chunk)
              .order("id")
              .range(from, to);
            if (error) throw new Error(error.message);
            return data ?? [];
          })
        )
      : [];

    const lineItems = rawLineItems.filter((item) => {
      const normalized = normalizeFuelProduct(item.product);
      if (!normalized) return false;
      if (!product) return true;
      return normalized === product || (item.product || "").toLowerCase().includes(product.toLowerCase());
    });

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
    const sheet = workbook.addWorksheet(buildSheetName(dateFrom));

    sheet.getCell("A1").value = buildReportTitle(dateFrom);
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
      filename: buildReportFilename(dateFrom),
    };
  }
}

export const excelReportService = new ExcelReportService();

/** @deprecated Use REPORT_COLUMNS from report-format.ts */
export const COLUMNS = REPORT_COLUMNS;
