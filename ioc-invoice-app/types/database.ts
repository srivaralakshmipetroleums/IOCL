export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      extraction_results: {
        Row: {
          confidence: Json | null;
          created_at: string;
          id: string;
          invoice_id: string;
          normalized_data: Json | null;
          provider: string;
          provider_version: string | null;
          raw_response: Json | null;
        };
        Insert: {
          confidence?: Json | null;
          created_at?: string;
          id?: string;
          invoice_id: string;
          normalized_data?: Json | null;
          provider: string;
          provider_version?: string | null;
          raw_response?: Json | null;
        };
        Update: {
          confidence?: Json | null;
          created_at?: string;
          id?: string;
          invoice_id?: string;
          normalized_data?: Json | null;
          provider?: string;
          provider_version?: string | null;
          raw_response?: Json | null;
        };
        Relationships: [];
      };
      invoice_line_items: {
        Row: {
          created_at: string;
          hsn_code: string | null;
          id: string;
          invoice_id: string;
          invoice_value: number | null;
          material_code: string | null;
          output_measure: string | null;
          output_quantity: number | null;
          product: string | null;
          quantity: number | null;
          rate: number | null;
          unit: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          hsn_code?: string | null;
          id?: string;
          invoice_id: string;
          invoice_value?: number | null;
          material_code?: string | null;
          output_measure?: string | null;
          output_quantity?: number | null;
          product?: string | null;
          quantity?: number | null;
          rate?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          hsn_code?: string | null;
          id?: string;
          invoice_id?: string;
          invoice_value?: number | null;
          material_code?: string | null;
          output_measure?: string | null;
          output_quantity?: number | null;
          product?: string | null;
          quantity?: number | null;
          rate?: number | null;
          unit?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          consignee_name: string | null;
          content_hash: string | null;
          created_at: string;
          delivery_number: string | null;
          id: string;
          invoice_date: string | null;
          invoice_number: string | null;
          invoice_total: number | null;
          payer_name: string | null;
          pdf_storage_path: string | null;
          po_reference: string | null;
          rounding_difference: number | null;
          sales_order_number: string | null;
          sap_entry_number: string | null;
          source_message_id: string | null;
          source_type: string | null;
          status: string;
          supplier_code: string | null;
          supplier_name: string | null;
          transport_number: string | null;
          updated_at: string;
        };
        Insert: {
          consignee_name?: string | null;
          content_hash?: string | null;
          created_at?: string;
          delivery_number?: string | null;
          id?: string;
          invoice_date?: string | null;
          invoice_number?: string | null;
          invoice_total?: number | null;
          payer_name?: string | null;
          pdf_storage_path?: string | null;
          po_reference?: string | null;
          rounding_difference?: number | null;
          sales_order_number?: string | null;
          sap_entry_number?: string | null;
          source_message_id?: string | null;
          source_type?: string | null;
          status?: string;
          supplier_code?: string | null;
          supplier_name?: string | null;
          transport_number?: string | null;
          updated_at?: string;
        };
        Update: {
          consignee_name?: string | null;
          content_hash?: string | null;
          created_at?: string;
          delivery_number?: string | null;
          id?: string;
          invoice_date?: string | null;
          invoice_number?: string | null;
          invoice_total?: number | null;
          payer_name?: string | null;
          pdf_storage_path?: string | null;
          po_reference?: string | null;
          rounding_difference?: number | null;
          sales_order_number?: string | null;
          sap_entry_number?: string | null;
          source_message_id?: string | null;
          source_type?: string | null;
          status?: string;
          supplier_code?: string | null;
          supplier_name?: string | null;
          transport_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      processing_job_items: {
        Row: {
          completed_at: string | null;
          created_at: string;
          error_message: string | null;
          filename: string;
          id: string;
          invoice_id: string | null;
          job_id: string;
          progress: number;
          started_at: string | null;
          status: string;
          storage_path: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          filename: string;
          id?: string;
          invoice_id?: string | null;
          job_id: string;
          progress?: number;
          started_at?: string | null;
          status?: string;
          storage_path?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          error_message?: string | null;
          filename?: string;
          id?: string;
          invoice_id?: string | null;
          job_id?: string;
          progress?: number;
          started_at?: string | null;
          status?: string;
          storage_path?: string | null;
        };
        Relationships: [];
      };
      processing_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          error_message: string | null;
          failed_files: number;
          id: string;
          job_type: string;
          processed_files: number;
          skipped_files: number;
          started_at: string | null;
          status: string;
          successful_files: number;
          total_files: number;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          failed_files?: number;
          id?: string;
          job_type?: string;
          processed_files?: number;
          skipped_files?: number;
          started_at?: string | null;
          status?: string;
          successful_files?: number;
          total_files?: number;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          error_message?: string | null;
          failed_files?: number;
          id?: string;
          job_type?: string;
          processed_files?: number;
          skipped_files?: number;
          started_at?: string | null;
          status?: string;
          successful_files?: number;
          total_files?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceLineItem = Database["public"]["Tables"]["invoice_line_items"]["Row"];
export type InvoiceLineItemInsert = Database["public"]["Tables"]["invoice_line_items"]["Insert"];
export type ProcessingJob = Database["public"]["Tables"]["processing_jobs"]["Row"];
export type ProcessingJobItem = Database["public"]["Tables"]["processing_job_items"]["Row"];

export type InvoiceStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "EXTRACTED"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "FAILED"
  | "DUPLICATE"
  | "SKIPPED"
  | "REPLACED";
