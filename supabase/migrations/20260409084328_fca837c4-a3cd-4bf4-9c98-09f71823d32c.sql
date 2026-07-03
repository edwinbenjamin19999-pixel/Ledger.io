
-- Add new columns to fixed_assets
ALTER TABLE public.fixed_assets 
  ADD COLUMN IF NOT EXISTS asset_class text NOT NULL DEFAULT 'tangible',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS responsible_person text,
  ADD COLUMN IF NOT EXISTS project_id text,
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id),
  ADD COLUMN IF NOT EXISTS activation_date text,
  ADD COLUMN IF NOT EXISTS legal_duration_years integer,
  ADD COLUMN IF NOT EXISTS maturity_date text,
  ADD COLUMN IF NOT EXISTS interest_rate numeric,
  ADD COLUMN IF NOT EXISTS current_valuation numeric,
  ADD COLUMN IF NOT EXISTS last_valuation_date text,
  ADD COLUMN IF NOT EXISTS disposal_date text,
  ADD COLUMN IF NOT EXISTS disposal_amount numeric,
  ADD COLUMN IF NOT EXISTS original_journal_entry_id uuid REFERENCES public.journal_entries(id);

-- Create asset_events table
CREATE TABLE IF NOT EXISTS public.asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_asset_id uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  event_type text NOT NULL,
  description text,
  old_value jsonb,
  new_value jsonb,
  accounting_impact jsonb,
  journal_entry_id uuid REFERENCES public.journal_entries(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view asset events for their companies"
  ON public.asset_events FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

CREATE POLICY "Users can create asset events for their companies"
  ON public.asset_events FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

CREATE INDEX idx_asset_events_asset ON public.asset_events(fixed_asset_id);
CREATE INDEX idx_asset_events_company ON public.asset_events(company_id);
