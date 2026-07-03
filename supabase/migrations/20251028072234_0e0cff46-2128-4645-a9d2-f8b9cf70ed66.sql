-- Create system health logs table
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL,
  tests JSONB,
  fixes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_system_health_logs_timestamp ON public.system_health_logs(timestamp DESC);

-- Enable RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view health logs (for now, allow read for authenticated users)
CREATE POLICY "Authenticated users can view health logs"
  ON public.system_health_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- System can insert health logs
CREATE POLICY "Service role can insert health logs"
  ON public.system_health_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable pg_cron for scheduled health checks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto health check every 5 minutes
SELECT cron.schedule(
  'auto-health-check-every-5min',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://gvlzltcwdsglmkiijlie.supabase.co/functions/v1/auto-health-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bHpsdGN3ZHNnbG1raWlqbGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjE0NDcsImV4cCI6MjA3Njg5NzQ0N30.lUZtLRnPU3Qoy1xIR4BNaI7zRFIANw6W3zN7D7XlPKw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Auto-cleanup old health logs (keep last 7 days)
SELECT cron.schedule(
  'cleanup-old-health-logs',
  '0 2 * * *', -- Run daily at 2 AM
  $$
  DELETE FROM public.system_health_logs
  WHERE created_at < now() - interval '7 days';
  $$
);