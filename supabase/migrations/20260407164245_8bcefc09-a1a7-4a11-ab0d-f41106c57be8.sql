
-- Agent booking rules (learned patterns)
CREATE TABLE public.agent_booking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'learned',
  match_field TEXT NOT NULL DEFAULT 'counterparty',
  match_pattern TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  vat_code TEXT,
  category TEXT,
  hit_count INTEGER NOT NULL DEFAULT 1,
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT DEFAULT 'user_correction',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agent auto-booking log
CREATE TABLE public.agent_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  source_type TEXT NOT NULL,
  source_id TEXT,
  counterparty TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SEK',
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  vat_code TEXT,
  confidence NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'auto_booked',
  explanation TEXT,
  rule_id UUID REFERENCES public.agent_booking_rules(id),
  user_corrected BOOLEAN DEFAULT false,
  corrected_account TEXT,
  corrected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly confidence history for learning curve
CREATE TABLE public.agent_confidence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  auto_booked INTEGER NOT NULL DEFAULT 0,
  review_needed INTEGER NOT NULL DEFAULT 0,
  user_flagged INTEGER NOT NULL DEFAULT 0,
  avg_confidence NUMERIC DEFAULT 0,
  rules_learned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, month)
);

-- Enable RLS
ALTER TABLE public.agent_booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_confidence_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage agent rules for their companies" ON public.agent_booking_rules
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view agent bookings for their companies" ON public.agent_bookings
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view confidence history for their companies" ON public.agent_confidence_history
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
