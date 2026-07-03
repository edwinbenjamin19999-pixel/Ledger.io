
-- Capcito factoring requests
CREATE TABLE public.factoring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  invoice_amount NUMERIC NOT NULL,
  factoring_amount NUMERIC,
  fee_amount NUMERIC,
  fee_percentage NUMERIC,
  capcito_reference TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.factoring_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company factoring" ON public.factoring_requests
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Inkassogram collection cases
CREATE TABLE public.collection_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  debtor_name TEXT,
  debtor_org_number TEXT,
  original_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC,
  interest_amount NUMERIC DEFAULT 0,
  collection_fee NUMERIC DEFAULT 0,
  inkassogram_reference TEXT,
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  close_reason TEXT,
  reminder_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collection_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company collections" ON public.collection_cases
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Scrive signing envelopes
CREATE TABLE public.signing_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  scrive_document_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  signatories JSONB DEFAULT '[]',
  file_url TEXT,
  signed_file_url TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signing_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company signing" ON public.signing_envelopes
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Integration credentials per company
CREATE TABLE public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, provider)
);

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company integrations" ON public.integration_credentials
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
