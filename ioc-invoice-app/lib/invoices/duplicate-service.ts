import { createServiceClient } from "@/lib/supabase/server";
import type { Invoice } from "@/types/database";

export class DuplicateService {
  async findDuplicate(supplierName: string, invoiceNumber: string): Promise<Invoice | null> {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("supplier_name", supplierName)
      .eq("invoice_number", invoiceNumber)
      .not("status", "in", '("DUPLICATE","SKIPPED")')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async findByContentHash(contentHash: string): Promise<Invoice | null> {
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("content_hash", contentHash)
      .not("status", "in", '("DUPLICATE","SKIPPED")')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  async countInPeriod(dateFrom: string, dateTo: string): Promise<number> {
    const supabase = await createServiceClient();

    const { count, error } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .gte("invoice_date", dateFrom)
      .lt("invoice_date", dateTo)
      .not("status", "in", '("DUPLICATE","SKIPPED","FAILED")');

    if (error) throw new Error(error.message);
    return count || 0;
  }

  async markAsDuplicate(invoiceId: string): Promise<void> {
    const supabase = await createServiceClient();
    await supabase.from("invoices").update({ status: "DUPLICATE" }).eq("id", invoiceId);
  }
}

export const duplicateService = new DuplicateService();
