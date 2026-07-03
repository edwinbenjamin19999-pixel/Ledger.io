
-- ENUMS
DO $$ BEGIN CREATE TYPE public.report_template_type AS ENUM ('rr','br','cashflow','management_report','budget','forecast','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_framework AS ENUM ('k2','k3','internal','tax','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_section_type AS ENUM ('header','body','subtotal_group','total_group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_row_type AS ENUM ('section','group','account','subtotal','total','calculated','note_reference'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_calc_type AS ENUM ('sum','formula','mapped_accounts','derived','manual','none'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_sign_behavior AS ENUM ('normal','invert','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_display_style AS ENUM ('normal','bold','subtotal','total','muted','highlighted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.account_mapping_scope AS ENUM ('single_company','group','all','tenant_specific'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.account_mapping_type AS ENUM ('actual','budget','forecast','tax','management'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_value_layer AS ENUM (
  'actual_opening_balance','actual_opening_saldo','actual_period_movement','actual_closing_balance',
  'budget_period_value','budget_ytd_value','budget_closing_projection',
  'forecast_period_value','forecast_ytd_value','forecast_closing_projection',
  'scenario_period_value','variance_actual_vs_budget','variance_actual_vs_forecast','variance_percent','margin_percent'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.financial_value_source AS ENUM ('ledger','budget','forecast','scenario','adjustment','elimination','manual_override','derived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_scenario_type AS ENUM ('budget','forecast','sensitivity','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.report_scenario_adjustment_type AS ENUM ('delta','percent','override','formula'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.validation_type AS ENUM ('balance_sheet_not_balanced','result_mismatch_rr_vs_br','abnormal_negative_balance','missing_account_mapping','incomplete_period_data','formula_cycle','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.validation_severity AS ENUM ('info','warning','error','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.validation_status AS ENUM ('open','resolved','ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.drilldown_source_type AS ENUM ('account','journal_entry','voucher','document','tax_box','adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- HELPER: company membership check (any role for a given company)
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL, name text NOT NULL,
  type public.report_template_type NOT NULL,
  framework public.report_framework NOT NULL DEFAULT 'k2',
  version int NOT NULL DEFAULT 1,
  is_system boolean NOT NULL DEFAULT false,
  tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_templates_code_unique UNIQUE (code, version, tenant_id),
  CONSTRAINT report_templates_system_no_tenant CHECK ((is_system AND tenant_id IS NULL) OR NOT is_system)
);
CREATE INDEX IF NOT EXISTS idx_re_templates_type ON public.report_templates(type) WHERE is_active;
DROP TRIGGER IF EXISTS trg_re_templates_updated ON public.report_templates;
CREATE TRIGGER trg_re_templates_updated BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  code text NOT NULL, label text NOT NULL,
  sequence int NOT NULL DEFAULT 0,
  parent_section_id uuid REFERENCES public.report_sections(id) ON DELETE CASCADE,
  level int NOT NULL DEFAULT 0,
  section_type public.report_section_type NOT NULL DEFAULT 'body',
  is_collapsible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_sections_code_unique UNIQUE (template_id, code)
);
CREATE INDEX IF NOT EXISTS idx_re_sections_template ON public.report_sections(template_id, sequence);
DROP TRIGGER IF EXISTS trg_re_sections_updated ON public.report_sections;
CREATE TRIGGER trg_re_sections_updated BEFORE UPDATE ON public.report_sections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.report_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.report_sections(id) ON DELETE SET NULL,
  code text NOT NULL, label text NOT NULL,
  sequence int NOT NULL DEFAULT 0, level int NOT NULL DEFAULT 0,
  parent_row_id uuid REFERENCES public.report_rows(id) ON DELETE CASCADE,
  row_type public.report_row_type NOT NULL DEFAULT 'group',
  calculation_type public.report_calc_type NOT NULL DEFAULT 'mapped_accounts',
  formula_expression text,
  sign_behavior public.report_sign_behavior NOT NULL DEFAULT 'normal',
  is_visible_default boolean NOT NULL DEFAULT true,
  is_drillable boolean NOT NULL DEFAULT true,
  is_editable boolean NOT NULL DEFAULT false,
  supports_margin_percent boolean NOT NULL DEFAULT false,
  supports_variance boolean NOT NULL DEFAULT true,
  supports_scenario boolean NOT NULL DEFAULT true,
  supports_validation boolean NOT NULL DEFAULT true,
  display_style public.report_display_style NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_rows_code_unique UNIQUE (template_id, code)
);
CREATE INDEX IF NOT EXISTS idx_re_rows_template ON public.report_rows(template_id, sequence);
CREATE INDEX IF NOT EXISTS idx_re_rows_section ON public.report_rows(section_id);
DROP TRIGGER IF EXISTS trg_re_rows_updated ON public.report_rows;
CREATE TRIGGER trg_re_rows_updated BEFORE UPDATE ON public.report_rows FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.account_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.report_rows(id) ON DELETE CASCADE,
  account_from text NOT NULL, account_to text NOT NULL,
  company_scope public.account_mapping_scope NOT NULL DEFAULT 'all',
  tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  mapping_type public.account_mapping_type NOT NULL DEFAULT 'actual',
  sign_override public.report_sign_behavior,
  dimension_filter_json jsonb, scenario_filter_json jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_re_account_mappings_row ON public.account_mappings(row_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_re_account_mappings_range ON public.account_mappings(account_from, account_to) WHERE is_active;
DROP TRIGGER IF EXISTS trg_re_account_mappings_updated ON public.account_mappings;
CREATE TRIGGER trg_re_account_mappings_updated BEFORE UPDATE ON public.account_mappings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year int NOT NULL, month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  quarter int NOT NULL GENERATED ALWAYS AS (((month - 1) / 3) + 1) STORED,
  period_code text NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  fiscal_year_id uuid, is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT periods_unique UNIQUE (company_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_re_periods_company_year ON public.periods(company_id, year, month);
DROP TRIGGER IF EXISTS trg_re_periods_updated ON public.periods;
CREATE TRIGGER trg_re_periods_updated BEFORE UPDATE ON public.periods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.report_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  scenario_type public.report_scenario_type NOT NULL DEFAULT 'custom',
  description text,
  base_period_id uuid REFERENCES public.periods(id) ON DELETE SET NULL,
  base_layer public.financial_value_layer DEFAULT 'forecast_period_value',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_re_scenarios_company ON public.report_scenarios(company_id) WHERE is_active;
DROP TRIGGER IF EXISTS trg_re_scenarios_updated ON public.report_scenarios;
CREATE TRIGGER trg_re_scenarios_updated BEFORE UPDATE ON public.report_scenarios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.financial_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.report_rows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  value_layer public.financial_value_layer NOT NULL,
  scenario_id uuid REFERENCES public.report_scenarios(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  source_type public.financial_value_source NOT NULL DEFAULT 'ledger',
  source_ref_id uuid,
  currency text NOT NULL DEFAULT 'SEK',
  is_stale boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_values_unique UNIQUE (row_id, company_id, period_id, value_layer, scenario_id)
);
CREATE INDEX IF NOT EXISTS idx_re_fv_company_period ON public.financial_values(company_id, period_id, value_layer);
CREATE INDEX IF NOT EXISTS idx_re_fv_stale ON public.financial_values(company_id, period_id) WHERE is_stale;
DROP TRIGGER IF EXISTS trg_re_fv_updated ON public.financial_values;
CREATE TRIGGER trg_re_fv_updated BEFORE UPDATE ON public.financial_values FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.report_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL,
  visible_columns_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled_value_layers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  supports_ai boolean NOT NULL DEFAULT true,
  supports_validation boolean NOT NULL DEFAULT true,
  supports_export_pdf boolean NOT NULL DEFAULT true,
  supports_export_excel boolean NOT NULL DEFAULT true,
  supports_export_docx boolean NOT NULL DEFAULT false,
  supports_drilldown boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  tenant_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_views_code_unique UNIQUE (template_id, code, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_re_views_template ON public.report_views(template_id);
DROP TRIGGER IF EXISTS trg_re_views_updated ON public.report_views;
CREATE TRIGGER trg_re_views_updated BEFORE UPDATE ON public.report_views FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.report_scenario_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.report_scenarios(id) ON DELETE CASCADE,
  row_id uuid NOT NULL REFERENCES public.report_rows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  adjustment_type public.report_scenario_adjustment_type NOT NULL DEFAULT 'delta',
  delta_amount numeric(18,2), delta_percent numeric(8,4),
  period_id uuid REFERENCES public.periods(id) ON DELETE CASCADE,
  payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_re_scen_adj_scenario ON public.report_scenario_adjustments(scenario_id);
DROP TRIGGER IF EXISTS trg_re_scen_adj_updated ON public.report_scenario_adjustments;
CREATE TRIGGER trg_re_scen_adj_updated BEFORE UPDATE ON public.report_scenario_adjustments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.periods(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.report_templates(id) ON DELETE CASCADE,
  row_id uuid REFERENCES public.report_rows(id) ON DELETE CASCADE,
  validation_type public.validation_type NOT NULL,
  severity public.validation_severity NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  difference_amount numeric(18,2),
  supporting_refs_json jsonb,
  status public.validation_status NOT NULL DEFAULT 'open',
  resolved_by uuid, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_re_val_dedupe
  ON public.validation_results(company_id, period_id, validation_type, COALESCE(row_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_re_val_company ON public.validation_results(company_id, status);
DROP TRIGGER IF EXISTS trg_re_val_updated ON public.validation_results;
CREATE TRIGGER trg_re_val_updated BEFORE UPDATE ON public.validation_results FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.drilldown_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.report_rows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  source_type public.drilldown_source_type NOT NULL,
  source_ref_id uuid NOT NULL,
  account_number text,
  contribution_amount numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_re_drill_row_period ON public.drilldown_links(row_id, company_id, period_id);

CREATE TABLE IF NOT EXISTS public.ai_insight_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.report_rows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.periods(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.report_scenarios(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  insight_summary text NOT NULL,
  confidence_score numeric(4,3) NOT NULL DEFAULT 0,
  source_refs_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_re_ai_insight_row ON public.ai_insight_refs(row_id, company_id, period_id);

-- RLS
ALTER TABLE public.report_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sections              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_rows                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mappings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_values             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_views                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_scenarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_scenario_adjustments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drilldown_links              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insight_refs              ENABLE ROW LEVEL SECURITY;

-- Templates / sections / rows / views / mappings: read-all-authenticated for system; admin write
DROP POLICY IF EXISTS "templates readable" ON public.report_templates;
CREATE POLICY "templates readable" ON public.report_templates FOR SELECT TO authenticated USING (
  is_system OR (tenant_id IS NOT NULL AND public.is_company_member(auth.uid(), tenant_id))
);
DROP POLICY IF EXISTS "templates manageable by admins" ON public.report_templates;
CREATE POLICY "templates manageable by admins" ON public.report_templates FOR ALL TO authenticated
  USING ((is_system AND public.has_role(auth.uid(),'admin', NULL)) OR (tenant_id IS NOT NULL AND public.has_role(auth.uid(),'admin', tenant_id)))
  WITH CHECK ((is_system AND public.has_role(auth.uid(),'admin', NULL)) OR (tenant_id IS NOT NULL AND public.has_role(auth.uid(),'admin', tenant_id)));

DROP POLICY IF EXISTS "sections readable" ON public.report_sections;
CREATE POLICY "sections readable" ON public.report_sections FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.report_templates t WHERE t.id = template_id AND (t.is_system OR (t.tenant_id IS NOT NULL AND public.is_company_member(auth.uid(), t.tenant_id))))
);
DROP POLICY IF EXISTS "sections manageable by admins" ON public.report_sections;
CREATE POLICY "sections manageable by admins" ON public.report_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_templates t WHERE t.id = template_id AND ((t.is_system AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', t.tenant_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_templates t WHERE t.id = template_id AND ((t.is_system AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', t.tenant_id))));

DROP POLICY IF EXISTS "rows readable" ON public.report_rows;
CREATE POLICY "rows readable" ON public.report_rows FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.report_templates t WHERE t.id = template_id AND (t.is_system OR (t.tenant_id IS NOT NULL AND public.is_company_member(auth.uid(), t.tenant_id))))
);
DROP POLICY IF EXISTS "rows manageable by admins" ON public.report_rows;
CREATE POLICY "rows manageable by admins" ON public.report_rows FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_templates t WHERE t.id = template_id AND ((t.is_system AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', t.tenant_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_templates t WHERE t.id = template_id AND ((t.is_system AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', t.tenant_id))));

DROP POLICY IF EXISTS "views readable" ON public.report_views;
CREATE POLICY "views readable" ON public.report_views FOR SELECT TO authenticated USING (
  is_system OR (tenant_id IS NOT NULL AND public.is_company_member(auth.uid(), tenant_id))
);
DROP POLICY IF EXISTS "views manageable by admins" ON public.report_views;
CREATE POLICY "views manageable by admins" ON public.report_views FOR ALL TO authenticated
  USING ((is_system AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', tenant_id))
  WITH CHECK ((is_system AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', tenant_id));

DROP POLICY IF EXISTS "mappings readable" ON public.account_mappings;
CREATE POLICY "mappings readable" ON public.account_mappings FOR SELECT TO authenticated USING (
  tenant_id IS NULL OR public.is_company_member(auth.uid(), tenant_id)
);
DROP POLICY IF EXISTS "mappings manageable by admins" ON public.account_mappings;
CREATE POLICY "mappings manageable by admins" ON public.account_mappings FOR ALL TO authenticated
  USING ((tenant_id IS NULL AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', tenant_id))
  WITH CHECK ((tenant_id IS NULL AND public.has_role(auth.uid(),'admin',NULL)) OR public.has_role(auth.uid(),'admin', tenant_id));

-- Per-company tables
DROP POLICY IF EXISTS "periods access" ON public.periods;
CREATE POLICY "periods access" ON public.periods FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "financial_values readable" ON public.financial_values;
CREATE POLICY "financial_values readable" ON public.financial_values FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "report_scenarios access" ON public.report_scenarios;
CREATE POLICY "report_scenarios access" ON public.report_scenarios FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "report_scenario_adjustments access" ON public.report_scenario_adjustments;
CREATE POLICY "report_scenario_adjustments access" ON public.report_scenario_adjustments FOR ALL TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "validation_results readable" ON public.validation_results;
CREATE POLICY "validation_results readable" ON public.validation_results FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
DROP POLICY IF EXISTS "validation_results resolvable" ON public.validation_results;
CREATE POLICY "validation_results resolvable" ON public.validation_results FOR UPDATE TO authenticated
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "drilldown_links readable" ON public.drilldown_links;
CREATE POLICY "drilldown_links readable" ON public.drilldown_links FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "ai_insight_refs readable" ON public.ai_insight_refs;
CREATE POLICY "ai_insight_refs readable" ON public.ai_insight_refs FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
