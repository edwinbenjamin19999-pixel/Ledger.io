
-- Partners
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  environment_default TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment_default IN ('sandbox', 'production')),
  ip_allowlist TEXT[] DEFAULT NULL,
  contact_email TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partner API keys
CREATE TABLE public.partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  scopes JSONB NOT NULL DEFAULT '["transactions:write", "insights:read"]'::jsonb,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_api_keys_hash ON public.partner_api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_partner_api_keys_partner ON public.partner_api_keys(partner_id);

-- Partner client mapping
CREATE TABLE public.partner_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  external_client_ref TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, external_client_ref)
);

CREATE INDEX idx_partner_clients_lookup ON public.partner_clients(partner_id, external_client_ref);
CREATE INDEX idx_partner_clients_company ON public.partner_clients(company_id);

-- Partner API logs
CREATE TABLE public.partner_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ip TEXT,
  request_id TEXT NOT NULL,
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_api_logs_partner_created ON public.partner_api_logs(partner_id, created_at DESC);
CREATE INDEX idx_partner_api_logs_rate_limit ON public.partner_api_logs(partner_id, created_at) WHERE status_code < 500;

-- RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_api_logs ENABLE ROW LEVEL SECURITY;

-- Only platform admins can manage
CREATE POLICY "Platform admins manage partners"
  ON public.partners FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage partner keys"
  ON public.partner_api_keys FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage partner clients"
  ON public.partner_clients FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins view partner logs"
  ON public.partner_api_logs FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
