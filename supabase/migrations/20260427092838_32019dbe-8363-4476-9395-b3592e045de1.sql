
-- Error logs table for self-healing system
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id text UNIQUE NOT NULL,
  message text NOT NULL,
  stack text,
  component_stack text,
  url text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  user_id uuid,
  company_id uuid,
  breadcrumbs jsonb NOT NULL DEFAULT '[]'::jsonb,
  fix_status text NOT NULL DEFAULT 'pending',
  fix_analysis text,
  fix_root_cause text,
  fix_description text,
  fix_code text,
  fix_filename text,
  fix_affected_lines text,
  fix_confidence integer,
  fix_requires_manual_review boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT error_logs_fix_status_check
    CHECK (fix_status IN ('pending','analyzing','fixed','manual','failed','resolved')),
  CONSTRAINT error_logs_confidence_check
    CHECK (fix_confidence IS NULL OR (fix_confidence BETWEEN 0 AND 100))
);

CREATE INDEX idx_error_logs_error_id ON public.error_logs(error_id);
CREATE INDEX idx_error_logs_occurred_at ON public.error_logs(occurred_at DESC);
CREATE INDEX idx_error_logs_fix_status ON public.error_logs(fix_status);
CREATE INDEX idx_error_logs_message ON public.error_logs USING gin (message gin_trgm_ops);

-- Updated_at trigger
CREATE TRIGGER update_error_logs_updated_at
  BEFORE UPDATE ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins may read
CREATE POLICY "Platform admins can read error_logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Only platform admins may update (mark as resolved etc.)
CREATE POLICY "Platform admins can update error_logs"
  ON public.error_logs
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Inserts/updates from edge functions go through service role which bypasses RLS.
-- No INSERT policy for normal users — they cannot write directly.

-- Realtime
ALTER TABLE public.error_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_logs;
