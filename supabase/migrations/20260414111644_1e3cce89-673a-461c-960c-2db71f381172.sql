
-- Add data_version to companies for cache invalidation
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS data_version integer NOT NULL DEFAULT 1;

-- Create financial_cache table
CREATE TABLE public.financial_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  calculation_type text NOT NULL CHECK (calculation_type IN ('pnl', 'bs', 'cf')),
  scenario text NOT NULL DEFAULT 'base' CHECK (scenario IN ('base', 'best', 'worst')),
  fiscal_year integer NOT NULL,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_version integer NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, calculation_type, scenario, fiscal_year)
);

-- Index for fast lookups
CREATE INDEX idx_financial_cache_lookup ON public.financial_cache (company_id, calculation_type, scenario, fiscal_year);

-- Enable RLS
ALTER TABLE public.financial_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own company cache"
  ON public.financial_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.company_id = financial_cache.company_id
    )
  );

CREATE POLICY "Users can manage own company cache"
  ON public.financial_cache FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.company_id = financial_cache.company_id
    )
  );

-- Function to increment data_version on companies
CREATE OR REPLACE FUNCTION public.increment_company_data_version()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.companies
  SET data_version = data_version + 1
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on journal_entries
CREATE TRIGGER trg_increment_version_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_company_data_version();

-- Trigger on journal_entry_lines (get company_id via journal_entries)
CREATE OR REPLACE FUNCTION public.increment_company_data_version_from_lines()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.journal_entries
  WHERE id = COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);

  IF v_company_id IS NOT NULL THEN
    UPDATE public.companies
    SET data_version = data_version + 1
    WHERE id = v_company_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_increment_version_journal_lines
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_company_data_version_from_lines();
