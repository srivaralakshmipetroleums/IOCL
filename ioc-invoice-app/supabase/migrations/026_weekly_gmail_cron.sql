-- Weekly Gmail sync via Supabase pg_cron -> Vercel /api/cron/gmail-weekly
-- Schedule: Sundays 02:30 UTC (08:00 IST)
-- Requires vault secrets: gmail_cron_app_url, gmail_cron_secret

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-gmail-sync') THEN
    PERFORM cron.unschedule('weekly-gmail-sync');
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

SELECT cron.schedule(
  'weekly-gmail-sync',
  '30 2 * * 0',
  $$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gmail_cron_app_url' LIMIT 1)
           || '/api/cron/gmail-weekly',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gmail_cron_secret' LIMIT 1)
    ),
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);
