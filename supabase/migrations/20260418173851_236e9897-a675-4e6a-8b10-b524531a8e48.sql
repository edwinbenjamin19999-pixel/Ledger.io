-- Enums
DO $$ BEGIN
  CREATE TYPE public.consolidation_adjustment_type AS ENUM (
    'goodwill','fair_value','nci','reclassification',
    'fx_translation','unrealized_profit','group_correction','manual_override'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consolidation_adjustment_status AS ENUM ('draft','applied','reverted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consolidation_adjustment_source AS ENUM ('manual','ai_suggestion','recurring');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consolidation_suggestion_type AS ENUM (
    'elimination','goodwill','nci','fx_adjustment',
    'unrealized_profit','reclassification','overvalue','fair_value'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consolidation_suggestion_status AS ENUM ('pending','accepted','dismissed','applied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: check if user owns the group behind a consolidation period
CREATE OR REPLACE FUNCTION public.user_owns_consolidation_period(_user_id uuid, _period_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consolidation_periods cp
    JOIN public.groups g ON g.id = cp.group_id
    WHERE cp.id = _period_id AND g.created_by = _user_id
  );
$$;

-- =========================================================
-- consolidation_adjustments
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consolidation_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_period_id uuid NOT NULL REFERENCES public.consolidation_periods(id) ON DELETE CASCADE,
  adjustment_type public.consolidation_adjustment_type NOT NULL,
  affected_company_ids uuid[] NOT NULL DEFAULT '{}',
  description text,
  source public.consolidation_adjustment_source NOT NULL DEFAULT 'manual',
  ai_suggestion_id uuid,
  confidence numeric,
  total_amount numeric NOT NULL DEFAULT 0,
  status public.consolidation_adjustment_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  applied_at timestamptz,
  reverted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cons_adj_period ON public.consolidation_adjustments(consolidation_period_id);
CREATE INDEX IF NOT EXISTS idx_cons_adj_status ON public.consolidation_adjustments(status);

ALTER TABLE public.consolidation_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view adjustments" ON public.consolidation_adjustments
  FOR SELECT TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));
CREATE POLICY "Owners insert adjustments" ON public.consolidation_adjustments
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id) AND created_by = auth.uid());
CREATE POLICY "Owners update adjustments" ON public.consolidation_adjustments
  FOR UPDATE TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));
CREATE POLICY "Owners delete adjustments" ON public.consolidation_adjustments
  FOR DELETE TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));

-- =========================================================
-- consolidation_adjustment_lines
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consolidation_adjustment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id uuid NOT NULL REFERENCES public.consolidation_adjustments(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  company_id uuid,
  account_no text NOT NULL,
  account_name text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cons_adj_lines_adj ON public.consolidation_adjustment_lines(adjustment_id);

ALTER TABLE public.consolidation_adjustment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view adj lines" ON public.consolidation_adjustment_lines
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consolidation_adjustments a
    WHERE a.id = adjustment_id
      AND public.user_owns_consolidation_period(auth.uid(), a.consolidation_period_id)));
CREATE POLICY "Owners insert adj lines" ON public.consolidation_adjustment_lines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.consolidation_adjustments a
    WHERE a.id = adjustment_id
      AND public.user_owns_consolidation_period(auth.uid(), a.consolidation_period_id)));
CREATE POLICY "Owners update adj lines" ON public.consolidation_adjustment_lines
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consolidation_adjustments a
    WHERE a.id = adjustment_id
      AND public.user_owns_consolidation_period(auth.uid(), a.consolidation_period_id)));
CREATE POLICY "Owners delete adj lines" ON public.consolidation_adjustment_lines
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.consolidation_adjustments a
    WHERE a.id = adjustment_id
      AND public.user_owns_consolidation_period(auth.uid(), a.consolidation_period_id)));

-- =========================================================
-- consolidation_ai_suggestions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consolidation_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_period_id uuid NOT NULL REFERENCES public.consolidation_periods(id) ON DELETE CASCADE,
  suggestion_type public.consolidation_suggestion_type NOT NULL,
  title text NOT NULL,
  explanation text NOT NULL,
  financial_impact numeric,
  affected_section text,
  affected_companies jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_journal jsonb,
  confidence numeric NOT NULL DEFAULT 0.7,
  severity text NOT NULL DEFAULT 'medium',
  source_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.consolidation_suggestion_status NOT NULL DEFAULT 'pending',
  applied_adjustment_id uuid,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cons_sugg_period ON public.consolidation_ai_suggestions(consolidation_period_id);
CREATE INDEX IF NOT EXISTS idx_cons_sugg_status ON public.consolidation_ai_suggestions(status);

ALTER TABLE public.consolidation_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view ai sugg" ON public.consolidation_ai_suggestions
  FOR SELECT TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));
CREATE POLICY "Owners insert ai sugg" ON public.consolidation_ai_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));
CREATE POLICY "Owners update ai sugg" ON public.consolidation_ai_suggestions
  FOR UPDATE TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));
CREATE POLICY "Owners delete ai sugg" ON public.consolidation_ai_suggestions
  FOR DELETE TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));

-- =========================================================
-- consolidation_versions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consolidation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_period_id uuid NOT NULL REFERENCES public.consolidation_periods(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_locked boolean NOT NULL DEFAULT false,
  UNIQUE (consolidation_period_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_cons_versions_period ON public.consolidation_versions(consolidation_period_id);

ALTER TABLE public.consolidation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view versions" ON public.consolidation_versions
  FOR SELECT TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));
CREATE POLICY "Owners insert versions" ON public.consolidation_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id) AND created_by = auth.uid());
CREATE POLICY "Owners update versions" ON public.consolidation_versions
  FOR UPDATE TO authenticated
  USING (public.user_owns_consolidation_period(auth.uid(), consolidation_period_id));

-- updated_at triggers
CREATE TRIGGER trg_cons_adj_updated
  BEFORE UPDATE ON public.consolidation_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cons_sugg_updated
  BEFORE UPDATE ON public.consolidation_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.consolidation_adjustments REPLICA IDENTITY FULL;
ALTER TABLE public.consolidation_adjustment_lines REPLICA IDENTITY FULL;
ALTER TABLE public.consolidation_ai_suggestions REPLICA IDENTITY FULL;
ALTER TABLE public.consolidation_versions REPLICA IDENTITY FULL;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.consolidation_adjustments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.consolidation_adjustment_lines; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.consolidation_ai_suggestions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.consolidation_versions; EXCEPTION WHEN duplicate_object THEN NULL; END $$;