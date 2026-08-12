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

  async markAsDuplicate(invoiceId: string): Promise<void> {
    const supabase = await createServiceClient();
    await supabase.from("invoices").update({ status: "DUPLICATE" }).eq("id", invoiceId);
  }
}

export const duplicateService = new DuplicateService();
