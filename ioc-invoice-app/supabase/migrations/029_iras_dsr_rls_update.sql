-- Migration: iras_dsr_rls_update
-- Upsert on iras_dsr_records requires UPDATE (and SELECT) RLS policies.

CREATE POLICY "auth_update_iras_dsr_captures"
  ON iras_dsr_captures FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_update_iras_dsr_records"
  ON iras_dsr_records FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
