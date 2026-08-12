import ExcelJS from "exceljs";
import { createServiceClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  supplier?: string;
  product?: string;
}

const COLUMNS = [
  "DATE",
  "Name of the Suppllier",
  "BILL NO",
  "PRODUCT",
  "INVOICE VALUE",
  "HSN CODE",
  "QUANTITY",
  "MEASURE",
] as const;

export class ExcelReportService {
  async generateInvoiceReport(filters: ReportFilters = {}): Promise<Buffer> {
    const supabase = await createServiceClient();

    let query = supabase
      .from("invoice_line_items")
      .select(`
        *,
        invoices!inner (
          invoice_date,
          supplier_name,
          invoice_number,
          status
        )
      `)
      .eq("invoices.status", "APPROVED");

    if (filters.dateFrom) {
      query = query.gte("invoices.invoice_date", filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte("invoices.invoice_date", filters.dateTo);
    }
    if (filters.supplier) {
      query = query.ilike("invoices.supplier_name", `%${filters.supplier}%`);
    }
    if (filters.product) {
      query = query.ilike("product", `%${filters.product}%`);
    }

    const { data: rows, error } = await query.order("invoices(invoice_date)");

    if (error) throw new Error(error.message);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("MS HSD");

    sheet.addRow([...COLUMNS]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };

    for (const row of rows || []) {
      const invoice = row.invoices as {
        invoice_date: string;
        supplier_name: string;
        invoice_number: string;
      };

      sheet.addRow([
        invoice.invoice_date ? formatDate(invoice.invoice_date) : "",
        invoice.supplier_name || "",
        invoice.invoice_number || "",
        row.product || "",
        row.invoice_value ?? "",
        row.hsn_code || "",
        row.output_quantity ?? "",
        row.output_measure || "",
      ]);
    }

    sheet.columns.forEach((col) => {
      col.width = 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

export const excelReportService = new ExcelReportService();

export { COLUMNS };
