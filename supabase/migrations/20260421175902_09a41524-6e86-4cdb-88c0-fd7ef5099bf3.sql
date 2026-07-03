
CREATE TABLE IF NOT EXISTS public.scenario_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  driver_hash text NOT NULL,
  summary text NOT NULL,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, driver_hash)
);

CREATE INDEX IF NOT EXISTS idx_scenario_explanations_lookup
  ON public.scenario_explanations(scenario_id, driver_hash);

ALTER TABLE public.scenario_explanations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "se_access" ON public.scenario_explanations;
CREATE POLICY "se_access" ON public.scenario_explanations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.budget_scenarios bs
      JOIN public.budget_plans bp ON bp.id = bs.budget_id
      WHERE bs.id = scenario_explanations.scenario_id
        AND public.has_company_access(auth.uid(), bp.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.budget_scenarios bs
      JOIN public.budget_plans bp ON bp.id = bs.budget_id
      WHERE bs.id = scenario_explanations.scenario_id
        AND public.has_company_access(auth.uid(), bp.company_id)
    )
  );
