
-- Auditor access tokens for read-only external access
CREATE TABLE public.auditor_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  scope_type TEXT NOT NULL DEFAULT 'all' CHECK (scope_type IN ('all','fiscal_year','custom')),
  scope_year INT,
  scope_from DATE,
  scope_to DATE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL,
  granted_by UUID NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditor_access_company ON public.auditor_access(company_id);
CREATE INDEX idx_auditor_access_token ON public.auditor_access(token);

ALTER TABLE public.auditor_access ENABLE ROW LEVEL SECURITY;

-- Owners and accountants of the company can manage auditor access
CREATE POLICY "Owners/accountants can view auditor access"
  ON public.auditor_access FOR SELECT
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

CREATE POLICY "Owners/accountants can create auditor access"
  ON public.auditor_access FOR INSERT
  WITH CHECK (
    granted_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'owner', company_id)
      OR public.has_role(auth.uid(), 'accountant', company_id)
    )
  );

CREATE POLICY "Owners/accountants can update auditor access"
  ON public.auditor_access FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

CREATE POLICY "Owners/accountants can delete auditor access"
  ON public.auditor_access FOR DELETE
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

-- Auditor comments tied to a session
CREATE TABLE public.auditor_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_access_id UUID NOT NULL REFERENCES public.auditor_access(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditor_comments_entity ON public.auditor_comments(company_id, entity_type, entity_id);

ALTER TABLE public.auditor_comments ENABLE ROW LEVEL SECURITY;

-- Only owner/accountant of the company can read comments (not other users)
CREATE POLICY "Owners/accountants can view auditor comments"
  ON public.auditor_comments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

CREATE POLICY "Owners/accountants can resolve auditor comments"
  ON public.auditor_comments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

-- Inserts/deletes happen via edge function with service role (auditor session)
