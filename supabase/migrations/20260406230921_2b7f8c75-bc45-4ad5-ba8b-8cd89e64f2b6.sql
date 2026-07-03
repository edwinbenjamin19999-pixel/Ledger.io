
-- ============================================
-- Consolidation Periods
-- ============================================
CREATE TABLE public.consolidation_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','review','complete','locked')),
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, period_start, period_end)
);

ALTER TABLE public.consolidation_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage consolidation periods for their groups"
  ON public.consolidation_periods FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE c.group_id = consolidation_periods.group_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE c.group_id = consolidation_periods.group_id
        AND ur.user_id = auth.uid()
    )
  );

-- ============================================
-- Group Structure (ownership details per entity)
-- ============================================
CREATE TABLE public.group_structure (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  parent_entity_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  child_entity_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ownership_pct NUMERIC(5,2) NOT NULL DEFAULT 100,
  voting_pct NUMERIC(5,2) NOT NULL DEFAULT 100,
  consolidation_method TEXT NOT NULL DEFAULT 'full' CHECK (consolidation_method IN ('full','equity','proportional','excluded')),
  acquisition_date DATE,
  acquisition_price NUMERIC(15,2),
  net_assets_at_acquisition NUMERIC(15,2),
  goodwill_amount NUMERIC(15,2),
  disposal_date DATE,
  disposal_price NUMERIC(15,2),
  currency TEXT NOT NULL DEFAULT 'SEK',
  fiscal_year_start DATE,
  fiscal_year_end DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disposed','acquiring')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, parent_entity_id, child_entity_id)
);

ALTER TABLE public.group_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage group structure for their groups"
  ON public.group_structure FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE c.group_id = group_structure.group_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE c.group_id = group_structure.group_id
        AND ur.user_id = auth.uid()
    )
  );

-- ============================================
-- Entity Trial Balances
-- ============================================
CREATE TABLE public.entity_trial_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consolidation_period_id UUID NOT NULL REFERENCES public.consolidation_periods(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_no TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SEK',
  translated_sek_amount NUMERIC(15,2),
  translation_rate_type TEXT CHECK (translation_rate_type IN ('closing','average','historical')),
  import_source TEXT NOT NULL DEFAULT 'native' CHECK (import_source IN ('native','sie4','excel','manual')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.entity_trial_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage trial balances for their consolidation periods"
  ON public.entity_trial_balances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.consolidation_periods cp
      JOIN public.companies c ON c.group_id = cp.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE cp.id = entity_trial_balances.consolidation_period_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consolidation_periods cp
      JOIN public.companies c ON c.group_id = cp.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE cp.id = entity_trial_balances.consolidation_period_id
        AND ur.user_id = auth.uid()
    )
  );

-- ============================================
-- Account Mapping (kontoplanharmonisering)
-- ============================================
CREATE TABLE public.consolidation_account_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_account_no TEXT NOT NULL,
  entity_account_name TEXT,
  group_account_no TEXT NOT NULL,
  group_account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, entity_id, entity_account_no)
);

ALTER TABLE public.consolidation_account_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage account mapping for their groups"
  ON public.consolidation_account_mapping FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE c.group_id = consolidation_account_mapping.group_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE c.group_id = consolidation_account_mapping.group_id
        AND ur.user_id = auth.uid()
    )
  );

-- ============================================
-- Elimination Entries
-- ============================================
CREATE TABLE public.consolidation_elimination_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consolidation_period_id UUID NOT NULL REFERENCES public.consolidation_periods(id) ON DELETE CASCADE,
  elimination_type TEXT NOT NULL CHECK (elimination_type IN (
    'capital','intercompany_balance','intercompany_transaction',
    'unrealized_profit','minority','goodwill','deferred_tax','other'
  )),
  entity_a_id UUID NOT NULL REFERENCES public.companies(id),
  entity_b_id UUID REFERENCES public.companies(id),
  is_auto BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','rejected')),
  description TEXT,
  comment TEXT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consolidation_elimination_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage elimination entries for their consolidation periods"
  ON public.consolidation_elimination_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.consolidation_periods cp
      JOIN public.companies c ON c.group_id = cp.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE cp.id = consolidation_elimination_entries.consolidation_period_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consolidation_periods cp
      JOIN public.companies c ON c.group_id = cp.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE cp.id = consolidation_elimination_entries.consolidation_period_id
        AND ur.user_id = auth.uid()
    )
  );

-- ============================================
-- Elimination Lines (debit/credit rows)
-- ============================================
CREATE TABLE public.consolidation_elimination_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elimination_entry_id UUID NOT NULL REFERENCES public.consolidation_elimination_entries(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 1,
  account_no TEXT NOT NULL,
  account_name TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consolidation_elimination_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage elimination lines via parent entry"
  ON public.consolidation_elimination_lines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.consolidation_elimination_entries cee
      JOIN public.consolidation_periods cp ON cp.id = cee.consolidation_period_id
      JOIN public.companies c ON c.group_id = cp.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE cee.id = consolidation_elimination_lines.elimination_entry_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consolidation_elimination_entries cee
      JOIN public.consolidation_periods cp ON cp.id = cee.consolidation_period_id
      JOIN public.companies c ON c.group_id = cp.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE cee.id = consolidation_elimination_lines.elimination_entry_id
        AND ur.user_id = auth.uid()
    )
  );

-- ============================================
-- Goodwill Schedule
-- ============================================
CREATE TABLE public.goodwill_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_structure_id UUID NOT NULL REFERENCES public.group_structure(id) ON DELETE CASCADE,
  consolidation_period_id UUID NOT NULL REFERENCES public.consolidation_periods(id) ON DELETE CASCADE,
  opening_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  additions NUMERIC(15,2) NOT NULL DEFAULT 0,
  disposals NUMERIC(15,2) NOT NULL DEFAULT 0,
  amortization NUMERIC(15,2) NOT NULL DEFAULT 0,
  impairment NUMERIC(15,2) NOT NULL DEFAULT 0,
  closing_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  amortization_years INT NOT NULL DEFAULT 5,
  years_remaining INT,
  annual_charge NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goodwill_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage goodwill schedule via group structure"
  ON public.goodwill_schedule FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_structure gs
      JOIN public.companies c ON c.group_id = gs.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE gs.id = goodwill_schedule.group_structure_id
        AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_structure gs
      JOIN public.companies c ON c.group_id = gs.group_id
      JOIN public.user_roles ur ON ur.company_id = c.id
      WHERE gs.id = goodwill_schedule.group_structure_id
        AND ur.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_entity_trial_balances_period ON public.entity_trial_balances(consolidation_period_id);
CREATE INDEX idx_entity_trial_balances_entity ON public.entity_trial_balances(entity_id);
CREATE INDEX idx_consolidation_elim_entries_period ON public.consolidation_elimination_entries(consolidation_period_id);
CREATE INDEX idx_consolidation_elim_lines_entry ON public.consolidation_elimination_lines(elimination_entry_id);
CREATE INDEX idx_group_structure_group ON public.group_structure(group_id);
CREATE INDEX idx_goodwill_schedule_period ON public.goodwill_schedule(consolidation_period_id);
