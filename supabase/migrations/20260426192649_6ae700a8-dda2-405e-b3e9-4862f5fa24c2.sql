-- ============================================================
-- K3 Annual Report: Deferred Tax, Leases, Financial Instruments
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_annual_report_access(_user_id uuid, _annual_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.annual_reports ar
    WHERE ar.id = _annual_report_id
      AND public.has_company_access(_user_id, ar.company_id)
  );
$$;

-- 1) Deferred tax
CREATE TABLE public.ar_deferred_tax (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  temporary_differences jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_reconciliation jsonb NOT NULL DEFAULT '[]'::jsonb,
  net_deferred_tax_asset numeric(18,2) NOT NULL DEFAULT 0,
  net_deferred_tax_liability numeric(18,2) NOT NULL DEFAULT 0,
  effective_tax_rate numeric(6,4),
  tax_rate numeric(6,4) NOT NULL DEFAULT 0.206,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (annual_report_id)
);
CREATE INDEX idx_ar_deferred_tax_report ON public.ar_deferred_tax(annual_report_id);
ALTER TABLE public.ar_deferred_tax ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_deferred_tax_select" ON public.ar_deferred_tax FOR SELECT USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_deferred_tax_insert" ON public.ar_deferred_tax FOR INSERT WITH CHECK (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_deferred_tax_update" ON public.ar_deferred_tax FOR UPDATE USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_deferred_tax_delete" ON public.ar_deferred_tax FOR DELETE USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE TRIGGER trg_ar_deferred_tax_updated_at BEFORE UPDATE ON public.ar_deferred_tax FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Leases
CREATE TABLE public.ar_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  object_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('fastighet','fordon','maskiner','it','ovrig')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_payment numeric(18,2) NOT NULL,
  has_index_clause boolean NOT NULL DEFAULT false,
  index_type text,
  interest_rate numeric(6,4) NOT NULL DEFAULT 0.04,
  lease_term_months integer,
  initial_present_value numeric(18,2),
  current_liability numeric(18,2),
  long_term_liability numeric(18,2),
  rou_asset_value numeric(18,2),
  amortization_schedule jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_leases_report ON public.ar_leases(annual_report_id);
CREATE INDEX idx_ar_leases_category ON public.ar_leases(annual_report_id, category);
ALTER TABLE public.ar_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_leases_select" ON public.ar_leases FOR SELECT USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_leases_insert" ON public.ar_leases FOR INSERT WITH CHECK (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_leases_update" ON public.ar_leases FOR UPDATE USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_leases_delete" ON public.ar_leases FOR DELETE USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE TRIGGER trg_ar_leases_updated_at BEFORE UPDATE ON public.ar_leases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-compute lease_term_months when start/end change
CREATE OR REPLACE FUNCTION public.compute_lease_term_months()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    NEW.lease_term_months := GREATEST(0,
      ((EXTRACT(YEAR FROM NEW.end_date)::int - EXTRACT(YEAR FROM NEW.start_date)::int) * 12)
      + (EXTRACT(MONTH FROM NEW.end_date)::int - EXTRACT(MONTH FROM NEW.start_date)::int)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ar_leases_term BEFORE INSERT OR UPDATE OF start_date, end_date ON public.ar_leases
  FOR EACH ROW EXECUTE FUNCTION public.compute_lease_term_months();

-- 3) Financial instruments
CREATE TABLE public.ar_financial_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  instrument_name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'fin_assets_amortized_cost',
    'fin_assets_fair_value_pl',
    'fin_liabilities_amortized_cost'
  )),
  account_number text,
  book_value numeric(18,2) NOT NULL DEFAULT 0,
  fair_value numeric(18,2) NOT NULL DEFAULT 0,
  fair_value_level text CHECK (fair_value_level IN ('level_1','level_2','level_3','na')) DEFAULT 'na',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_fininstr_report ON public.ar_financial_instruments(annual_report_id);
CREATE INDEX idx_ar_fininstr_category ON public.ar_financial_instruments(annual_report_id, category);
ALTER TABLE public.ar_financial_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_fininstr_select" ON public.ar_financial_instruments FOR SELECT USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_fininstr_insert" ON public.ar_financial_instruments FOR INSERT WITH CHECK (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_fininstr_update" ON public.ar_financial_instruments FOR UPDATE USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE POLICY "ar_fininstr_delete" ON public.ar_financial_instruments FOR DELETE USING (public.has_annual_report_access(auth.uid(), annual_report_id));
CREATE TRIGGER trg_ar_fininstr_updated_at BEFORE UPDATE ON public.ar_financial_instruments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();