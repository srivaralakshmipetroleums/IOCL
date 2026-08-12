-- Migration: storage_bucket

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoice-pdfs', 'invoice-pdfs', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoice-pdfs');
CREATE POLICY "Authenticated users can read PDFs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoice-pdfs');
CREATE POLICY "Authenticated users can update PDFs" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'invoice-pdfs');
CREATE POLICY "Authenticated users can delete PDFs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'invoice-pdfs');
