CREATE TABLE IF NOT EXISTS public.ai_cfo_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_id text NOT NULL,
  insight_kind text NOT NULL,
  action text NOT NULL CHECK (action IN ('view','click','act','ignore','simulate','dismiss')),
  weight numeric NOT NULL DEFAULT 1.0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_cfo_signals_user_company ON public.ai_cfo_signals(user_id, company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cfo_signals_kind ON public.ai_cfo_signals(company_id, insight_kind, occurred_at DESC);

ALTER TABLE public.ai_cfo_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own signals"
ON public.ai_cfo_signals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read their own signals"
ON public.ai_cfo_signals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Company members read company signals"
ON public.ai_cfo_signals FOR SELECT
USING (public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'auditor'::app_role, company_id));

CREATE TABLE IF NOT EXISTS public.ai_cfo_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  growth_bias numeric NOT NULL DEFAULT 0.5 CHECK (growth_bias BETWEEN 0 AND 1),
  risk_tolerance numeric NOT NULL DEFAULT 0.5 CHECK (risk_tolerance BETWEEN 0 AND 1),
  kind_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  tone text NOT NULL DEFAULT 'soft' CHECK (tone IN ('soft','direct')),
  evidence_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.ai_cfo_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
ON public.ai_cfo_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ai_cfo_preferences_updated_at
BEFORE UPDATE ON public.ai_cfo_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();