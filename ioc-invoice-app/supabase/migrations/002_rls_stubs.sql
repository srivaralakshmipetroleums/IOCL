-- Migration: rls_stubs

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update invoices" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete invoices" ON invoices FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select line items" ON invoice_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert line items" ON invoice_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update line items" ON invoice_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete line items" ON invoice_line_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select jobs" ON processing_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs" ON processing_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs" ON processing_jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can select job items" ON processing_job_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert job items" ON processing_job_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update job items" ON processing_job_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can select extraction results" ON extraction_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert extraction results" ON extraction_results FOR INSERT TO authenticated WITH CHECK (true);
