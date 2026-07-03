
CREATE TABLE public.ai_action_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_id text NOT NULL,
  dismissed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, action_id)
);

CREATE INDEX idx_ai_action_dismissals_lookup
  ON public.ai_action_dismissals(company_id, user_id);

ALTER TABLE public.ai_action_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own action dismissals"
  ON public.ai_action_dismissals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert their own action dismissals"
  ON public.ai_action_dismissals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own action dismissals"
  ON public.ai_action_dismissals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own action dismissals"
  ON public.ai_action_dismissals FOR DELETE TO authenticated
  USING (user_id = auth.uid());
