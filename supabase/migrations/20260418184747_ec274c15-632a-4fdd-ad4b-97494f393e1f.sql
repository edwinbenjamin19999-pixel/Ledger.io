-- 1) system_action_log: audit trail for cross-module triggers
CREATE TABLE IF NOT EXISTS public.system_action_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_module text NOT NULL,
  target_module text NOT NULL,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'completed',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_action_log_company_created
  ON public.system_action_log(company_id, created_at DESC);

ALTER TABLE public.system_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_action_log_select" ON public.system_action_log;
CREATE POLICY "system_action_log_select"
  ON public.system_action_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = system_action_log.company_id
    )
  );

DROP POLICY IF EXISTS "system_action_log_insert" ON public.system_action_log;
CREATE POLICY "system_action_log_insert"
  ON public.system_action_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id = system_action_log.company_id
    )
  );

-- 2) scope column on ai_economist_actions (used as central insight store)
ALTER TABLE public.ai_economist_actions
  ADD COLUMN IF NOT EXISTS scope text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ai_economist_actions_scope
  ON public.ai_economist_actions USING gin(scope);

-- 3) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_action_log;