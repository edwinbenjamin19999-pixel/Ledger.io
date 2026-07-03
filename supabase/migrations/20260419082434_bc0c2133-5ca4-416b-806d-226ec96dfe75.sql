CREATE TABLE public.sie_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_hash TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  sie_type TEXT,
  org_number TEXT,
  company_name TEXT,
  fiscal_year_start DATE,
  fiscal_year_end DATE,
  status TEXT NOT NULL DEFAULT 'parsed' CHECK (status IN ('parsed','mapped','previewed','committed','failed','blocked')),
  parsed_summary JSONB DEFAULT '{}'::jsonb,
  mapping_summary JSONB DEFAULT '{}'::jsonb,
  validation_report JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  committed_at TIMESTAMPTZ,
  CONSTRAINT sie_import_sessions_company_hash_unique UNIQUE (company_id, file_hash)
);

CREATE INDEX idx_sie_import_sessions_company_status ON public.sie_import_sessions(company_id, status);
CREATE INDEX idx_sie_import_sessions_created_at ON public.sie_import_sessions(created_at DESC);

ALTER TABLE public.sie_import_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their company sie sessions"
  ON public.sie_import_sessions FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create sie sessions for their company"
  ON public.sie_import_sessions FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND created_by = auth.uid());

CREATE POLICY "Members can update their company sie sessions"
  ON public.sie_import_sessions FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can delete their own sie sessions"
  ON public.sie_import_sessions FOR DELETE
  USING (public.is_company_member(auth.uid(), company_id) AND created_by = auth.uid());

CREATE TABLE public.sie_account_mapping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_name TEXT,
  mapped_row_code TEXT,
  mapped_row_id UUID,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('rule','sru','history','ai','user')),
  reason TEXT,
  session_id UUID REFERENCES public.sie_import_sessions(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sie_mapping_history_company_account
  ON public.sie_account_mapping_history(company_id, account_number);
CREATE INDEX idx_sie_mapping_history_session
  ON public.sie_account_mapping_history(session_id);

ALTER TABLE public.sie_account_mapping_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mapping history for their company"
  ON public.sie_account_mapping_history FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can insert mapping history for their company"
  ON public.sie_account_mapping_history FOR INSERT
  WITH CHECK (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update mapping history for their company"
  ON public.sie_account_mapping_history FOR UPDATE
  USING (public.is_company_member(auth.uid(), company_id));