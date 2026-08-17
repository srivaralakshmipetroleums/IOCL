-- Migration: log every Gmail RSP message that has been processed
-- retail_selling_prices is unique on (product, effective_from), so later emails
-- overwrite source_message_id and previously imported messages get fetched again.

CREATE TABLE retail_price_gmail_messages (
  message_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('IMPORTED', 'UNPARSED')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE retail_price_gmail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_retail_price_gmail_messages"
  ON retail_price_gmail_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_retail_price_gmail_messages"
  ON retail_price_gmail_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_retail_price_gmail_messages"
  ON retail_price_gmail_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_retail_price_gmail_messages"
  ON retail_price_gmail_messages FOR DELETE TO authenticated USING (true);

INSERT INTO retail_price_gmail_messages (message_id, status)
SELECT DISTINCT source_message_id, 'IMPORTED'
FROM retail_selling_prices
WHERE source_message_id IS NOT NULL
ON CONFLICT (message_id) DO NOTHING;
