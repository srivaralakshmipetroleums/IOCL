-- Migration: fix_function_search_path

ALTER FUNCTION update_updated_at_column() SET search_path = public;

ALTER PUBLICATION supabase_realtime ADD TABLE processing_job_items;
