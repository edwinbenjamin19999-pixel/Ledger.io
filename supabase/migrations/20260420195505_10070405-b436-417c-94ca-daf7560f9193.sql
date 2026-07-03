
ALTER TABLE public.ai_economist_actions
  ADD COLUMN IF NOT EXISTS before_state jsonb,
  ADD COLUMN IF NOT EXISTS reverted_from uuid REFERENCES public.ai_economist_actions(id);

CREATE TABLE IF NOT EXISTS public.ai_ekonom_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  insight_id text NOT NULL,
  insight_kind text NOT NULL,
  action_type text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected','edited','reverted')),
  confidence numeric,
  financial_impact numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_ekonom_decisions_company_kind
  ON public.ai_ekonom_decisions(company_id, insight_kind, created_at DESC);

ALTER TABLE public.ai_ekonom_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members read decisions" ON public.ai_ekonom_decisions;
CREATE POLICY "Company members read decisions"
  ON public.ai_ekonom_decisions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin', company_id)
    OR public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
    OR public.has_role(auth.uid(), 'cfo', company_id)
    OR public.has_role(auth.uid(), 'limited_user', company_id)
  );

DROP POLICY IF EXISTS "Company members insert decisions" ON public.ai_ekonom_decisions;
CREATE POLICY "Company members insert decisions"
  ON public.ai_ekonom_decisions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (
    public.has_role(auth.uid(), 'admin', company_id)
    OR public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
    OR public.has_role(auth.uid(), 'cfo', company_id)
    OR public.has_role(auth.uid(), 'limited_user', company_id)
  ));
