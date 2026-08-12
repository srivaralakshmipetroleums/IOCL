-- Migration: rls_production

DROP POLICY IF EXISTS "Authenticated users can select invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;

CREATE POLICY "auth_select_invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Authenticated users can insert line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Authenticated users can update line items" ON invoice_line_items;
DROP POLICY IF EXISTS "Authenticated users can delete line items" ON invoice_line_items;

CREATE POLICY "auth_select_line_items" ON invoice_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_line_items" ON invoice_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_line_items" ON invoice_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_line_items" ON invoice_line_items FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can select jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON processing_jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON processing_jobs;

CREATE POLICY "auth_select_jobs" ON processing_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_jobs" ON processing_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_jobs" ON processing_jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can select job items" ON processing_job_items;
DROP POLICY IF EXISTS "Authenticated users can insert job items" ON processing_job_items;
DROP POLICY IF EXISTS "Authenticated users can update job items" ON processing_job_items;

CREATE POLICY "auth_select_job_items" ON processing_job_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_job_items" ON processing_job_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_job_items" ON processing_job_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can select extraction results" ON extraction_results;
DROP POLICY IF EXISTS "Authenticated users can insert extraction results" ON extraction_results;

CREATE POLICY "auth_select_extraction" ON extraction_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_extraction" ON extraction_results FOR INSERT TO authenticated WITH CHECK (true);
