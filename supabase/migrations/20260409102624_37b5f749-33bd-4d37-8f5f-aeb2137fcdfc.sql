
-- API Keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners/accountants can manage api keys"
  ON public.api_keys FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::public.app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role, company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::public.app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role, company_id)
  );

-- Webhooks table
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners/accountants can manage webhooks"
  ON public.webhooks FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::public.app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role, company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::public.app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role, company_id)
  );

-- Integration logs table
CREATE TABLE public.integration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  method TEXT,
  path TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view integration logs"
  ON public.integration_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.company_id = integration_logs.company_id
    )
  );

CREATE POLICY "System can insert integration logs"
  ON public.integration_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::public.app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role, company_id)
  );

-- Indexes
CREATE INDEX idx_api_keys_company ON public.api_keys(company_id);
CREATE INDEX idx_webhooks_company ON public.webhooks(company_id);
CREATE INDEX idx_integration_logs_company ON public.integration_logs(company_id);
CREATE INDEX idx_integration_logs_created ON public.integration_logs(created_at DESC);
