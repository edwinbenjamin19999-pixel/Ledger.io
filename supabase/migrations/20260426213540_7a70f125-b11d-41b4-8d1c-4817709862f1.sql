-- Drop existing jobs by name if they exist (idempotent)
DO $$
DECLARE
  job_name text;
BEGIN
  FOR job_name IN SELECT jobname FROM cron.job WHERE jobname IN ('bureau-risk-engine-nightly', 'bureau-proactive-alerts-morning', 'bureau-weekly-insights-monday')
  LOOP
    PERFORM cron.unschedule(job_name);
  END LOOP;
END $$;

SELECT cron.schedule(
  'bureau-risk-engine-nightly',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gvlzltcwdsglmkiijlie.supabase.co/functions/v1/bureau-risk-engine',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'bureau-proactive-alerts-morning',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gvlzltcwdsglmkiijlie.supabase.co/functions/v1/bureau-proactive-alerts',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'bureau-weekly-insights-monday',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://gvlzltcwdsglmkiijlie.supabase.co/functions/v1/bureau-weekly-insights',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);