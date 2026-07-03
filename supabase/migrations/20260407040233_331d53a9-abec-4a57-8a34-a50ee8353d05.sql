
CREATE TABLE public.company_annual_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year_end TEXT NOT NULL,
  document_id TEXT NOT NULL,
  file_format TEXT DEFAULT 'application/pdf',
  registered_at TIMESTAMPTZ,
  storage_path TEXT,
  file_size INTEGER,
  financial_data JSONB,
  fetch_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, document_id)
);

ALTER TABLE public.company_annual_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports for their companies"
  ON public.company_annual_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role, company_id) 
      OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
      OR public.has_role(auth.uid(), 'auditor'::app_role, company_id));

CREATE TABLE public.company_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  related_org_number TEXT NOT NULL,
  related_org_name TEXT,
  person_name TEXT,
  person_id_hash TEXT,
  role TEXT NOT NULL,
  is_signatory BOOLEAN DEFAULT false,
  engagement_type TEXT DEFAULT 'board_member',
  source TEXT DEFAULT 'bolagsverket',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view engagements for their companies"
  ON public.company_engagements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role, company_id)
      OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, company_id));

CREATE TABLE public.company_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  signatory_rule TEXT,
  persons JSONB,
  source TEXT DEFAULT 'bolagsverket',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatories for their companies"
  ON public.company_signatories FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role, company_id)
      OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, company_id));
