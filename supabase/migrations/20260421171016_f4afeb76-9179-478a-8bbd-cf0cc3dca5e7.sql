
-- Extend budget_scenarios
ALTER TABLE public.budget_scenarios
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS driver_patch jsonb,
  ADD COLUMN IF NOT EXISTS target_kpis jsonb,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Versioning table
CREATE TABLE IF NOT EXISTS public.scenario_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.budget_scenarios(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_scenario_versions_scenario_id
  ON public.scenario_versions(scenario_id, created_at DESC);

ALTER TABLE public.scenario_versions ENABLE ROW LEVEL SECURITY;

-- RLS: access mirrors budget_scenarios → budget_plans → company access
DROP POLICY IF EXISTS "Users access scenario versions via budget_plans"
  ON public.scenario_versions;

CREATE POLICY "Users access scenario versions via budget_plans"
ON public.scenario_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_scenarios bs
    JOIN public.budget_plans bp ON bp.id = bs.budget_id
    WHERE bs.id = scenario_versions.scenario_id
      AND public.has_company_access(auth.uid(), bp.company_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.budget_scenarios bs
    JOIN public.budget_plans bp ON bp.id = bs.budget_id
    WHERE bs.id = scenario_versions.scenario_id
      AND public.has_company_access(auth.uid(), bp.company_id)
  )
);
