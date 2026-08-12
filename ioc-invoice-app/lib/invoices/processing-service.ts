import { createServiceClient } from "@/lib/supabase/server";
import { getExtractor } from "@/lib/extraction/claude-extractor";
import { normalizeExtraction } from "@/lib/invoices/normalize-extraction";
import { invoiceRepository } from "@/lib/invoices/invoice-repository";
import { duplicateService } from "@/lib/invoices/duplicate-service";
import type { NormalizedInvoice } from "@/lib/invoices/normalize-extraction";

export class ProcessingService {
  async createJob(userId: string, totalFiles: number): Promise<string> {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("processing_jobs")
      .insert({
        job_type: "INVOICE_UPLOAD",
        status: "PENDING",
        total_files: totalFiles,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  }

  async addJobItem(jobId: string, filename: string): Promise<string> {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("processing_job_items")
      .insert({ job_id: jobId, filename, status: "PENDING" })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return data.id;
  }

  async updateJobItem(
    itemId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const supabase = await createServiceClient();
    await supabase.from("processing_job_items").update(updates).eq("id", itemId);
  }

  async processItem(
    itemId: string,
    storagePath: string,
    replaceInvoiceId?: string
  ): Promise<{ invoiceId: string; status: string }> {
    const supabase = await createServiceClient();

    await this.updateJobItem(itemId, {
      status: "PROCESSING",
      storage_path: storagePath,
      progress: 10,
      started_at: new Date().toISOString(),
    });

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("invoice-pdfs")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download PDF: ${downloadError?.message}`);
      }

      await this.updateJobItem(itemId, { progress: 30 });

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const extractor = getExtractor();
      const extracted = await extractor.extract({ pdfBuffer: buffer, filename: storagePath });

      await this.updateJobItem(itemId, { progress: 60 });

      const normalized = normalizeExtraction(extracted, {
        pdfStoragePath: storagePath,
        status: "EXTRACTED",
      });

      if (!replaceInvoiceId) {
        const existing = await duplicateService.findDuplicate(
          normalized.invoice.supplier_name!,
          normalized.invoice.invoice_number!
        );

        if (existing) {
          await this.updateJobItem(itemId, {
            status: "DUPLICATE",
            progress: 100,
            invoice_id: existing.id,
            completed_at: new Date().toISOString(),
            error_message: `Duplicate of invoice ${existing.invoice_number}`,
          });
          return { invoiceId: existing.id, status: "DUPLICATE" };
        }
      }

      const invoiceId = replaceInvoiceId || crypto.randomUUID();
      const invoice = await invoiceRepository.createWithLineItems(normalized, invoiceId);

      await this.updateJobItem(itemId, {
        status: "COMPLETED",
        progress: 100,
        invoice_id: invoice.id,
        completed_at: new Date().toISOString(),
      });

      return { invoiceId: invoice.id, status: "COMPLETED" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const { logError } = await import("@/lib/utils/logger");
      logError("processing-service.processItem", err);
      await this.updateJobItem(itemId, {
        status: "FAILED",
        progress: 100,
        error_message: message,
        completed_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  async startJob(jobId: string): Promise<void> {
    const supabase = await createServiceClient();

    await supabase
      .from("processing_jobs")
      .update({ status: "PROCESSING", started_at: new Date().toISOString() })
      .eq("id", jobId);

    const { data: items } = await supabase
      .from("processing_job_items")
      .select("*")
      .eq("job_id", jobId)
      .not("storage_path", "is", null)
      .in("status", ["UPLOADED", "UPLOADING"]);

    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of items || []) {
      if (!item.storage_path) continue;
      try {
        const result = await this.processItem(item.id, item.storage_path);
        if (result.status === "DUPLICATE") skipped++;
        else successful++;
      } catch {
        failed++;
      }
    }

    await supabase
      .from("processing_jobs")
      .update({
        status: failed === (items?.length || 0) ? "FAILED" : "COMPLETED",
        processed_files: (items?.length || 0),
        successful_files: successful,
        failed_files: failed,
        skipped_files: skipped,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  async getJob(jobId: string) {
    const supabase = await createServiceClient();
    const { data: job } = await supabase
      .from("processing_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    const { data: items } = await supabase
      .from("processing_job_items")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at");

    return { job, items: items || [] };
  }

  async retryInvoice(invoiceId: string): Promise<void> {
    const invoice = await invoiceRepository.getById(invoiceId);
    if (!invoice?.pdf_storage_path) throw new Error("No PDF found for invoice");

    await invoiceRepository.update(invoiceId, { status: "PROCESSING" });

    const extractor = getExtractor();
    const supabase = await createServiceClient();
    const { data: fileData } = await supabase.storage
      .from("invoice-pdfs")
      .download(invoice.pdf_storage_path);

    if (!fileData) throw new Error("Failed to download PDF");

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extracted = await extractor.extract({
      pdfBuffer: buffer,
      filename: invoice.pdf_storage_path,
    });

    const normalized = normalizeExtraction(extracted, {
      pdfStoragePath: invoice.pdf_storage_path,
      status: "NEEDS_REVIEW",
    });

    await invoiceRepository.update(invoiceId, normalized.invoice);
  }
}

export const processingService = new ProcessingService();
