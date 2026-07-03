
-- Corporate events table
CREATE TABLE IF NOT EXISTS public.corporate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(15,2),
  event_date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  participants JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.corporate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corporate_events_select" ON public.corporate_events
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "corporate_events_insert" ON public.corporate_events
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "corporate_events_update" ON public.corporate_events
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "corporate_events_delete" ON public.corporate_events
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

-- Shareholders table
CREATE TABLE IF NOT EXISTS public.shareholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  personal_org_number TEXT,
  shares INTEGER DEFAULT 0,
  share_class TEXT DEFAULT 'A',
  acquisition_date DATE,
  acquisition_price NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shareholders_select" ON public.shareholders
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "shareholders_insert" ON public.shareholders
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "shareholders_update" ON public.shareholders
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "shareholders_delete" ON public.shareholders
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX idx_corporate_events_company ON public.corporate_events(company_id);
CREATE INDEX idx_corporate_events_date ON public.corporate_events(event_date DESC);
CREATE INDEX idx_shareholders_company ON public.shareholders(company_id);
