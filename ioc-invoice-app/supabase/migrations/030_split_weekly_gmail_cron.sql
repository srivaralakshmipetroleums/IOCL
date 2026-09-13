-- Split weekly Gmail sync into invoices + RSP (async 202 endpoints, staggered)
-- Schedule: Sundays 02:30 UTC invoices, 02:38 UTC RSP (08:00 / 08:08 IST)
-- Endpoints return 202 immediately; pg_net only needs a short timeout.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-gmail-sync') THEN
    PERFORM cron.unschedule('weekly-gmail-sync');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-gmail-invoices') THEN
    PERFORM cron.unschedule('weekly-gmail-invoices');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-gmail-rsp') THEN
    PERFORM cron.unschedule('weekly-gmail-rsp');
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

SELECT cron.schedule(
  'weekly-gmail-invoices',
  '30 2 * * 0',
  $$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gmail_cron_app_url' LIMIT 1)
           || '/api/cron/gmail-weekly-invoices',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gmail_cron_secret' LIMIT 1)
    ),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'weekly-gmail-rsp',
  '38 2 * * 0',
  $$
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gmail_cron_app_url' LIMIT 1)
           || '/api/cron/gmail-weekly-rsp',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'gmail_cron_secret' LIMIT 1)
    ),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
