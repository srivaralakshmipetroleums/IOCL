import { createServiceClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceInsert, InvoiceLineItem, InvoiceLineItemInsert } from "@/types/database";
import type { NormalizedInvoice } from "./normalize-extraction";

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
}

export class InvoiceRepository {
  async createWithLineItems(
    normalized: NormalizedInvoice,
    invoiceId?: string
  ): Promise<InvoiceWithLineItems> {
    const supabase = await createServiceClient();

    const id = invoiceId || crypto.randomUUID();
    const invoiceData = { ...normalized.invoice, id };

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) throw new Error(`Failed to create invoice: ${invoiceError.message}`);

    const lineItemsData = normalized.lineItems.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }));

    const { data: lineItems, error: lineError } = await supabase
      .from("invoice_line_items")
      .insert(lineItemsData)
      .select();

    if (lineError) throw new Error(`Failed to create line items: ${lineError.message}`);

    await supabase.from("extraction_results").insert({
      invoice_id: invoice.id,
      provider: normalized.extractionResult.provider,
      provider_version: normalized.extractionResult.provider_version,
      raw_response: normalized.extractionResult.raw_response,
      normalized_data: normalized.extractionResult.normalized_data,
    });

    return { ...invoice, line_items: lineItems || [] };
  }

  async getById(id: string): Promise<InvoiceWithLineItems | null> {
    const supabase = await createServiceClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !invoice) return null;

    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("created_at");

    return { ...invoice, line_items: lineItems || [] };
  }

  async list(filters: {
    status?: string;
    supplier?: string;
    product?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ data: Invoice[]; total: number }> {
    const supabase = await createServiceClient();
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("invoices").select("*", { count: "exact" });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.supplier) query = query.ilike("supplier_name", `%${filters.supplier}%`);
    if (filters.dateFrom) query = query.gte("invoice_date", filters.dateFrom);
    if (filters.dateTo) query = query.lte("invoice_date", filters.dateTo);
    if (filters.search) {
      query = query.or(
        `invoice_number.ilike.%${filters.search}%,supplier_name.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query
      .order("invoice_date", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    return { data: data || [], total: count || 0 };
  }

  async update(id: string, updates: Partial<InvoiceInsert>): Promise<Invoice> {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateLineItems(invoiceId: string, items: Partial<InvoiceLineItemInsert>[]): Promise<void> {
    const supabase = await createServiceClient();
    for (const item of items) {
      if (!item.id) continue;
      await supabase
        .from("invoice_line_items")
        .update(item)
        .eq("id", item.id)
        .eq("invoice_id", invoiceId);
    }
  }

  async approve(id: string): Promise<Invoice> {
    return this.update(id, { status: "APPROVED" });
  }

  async delete(id: string): Promise<void> {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export const invoiceRepository = new InvoiceRepository();
