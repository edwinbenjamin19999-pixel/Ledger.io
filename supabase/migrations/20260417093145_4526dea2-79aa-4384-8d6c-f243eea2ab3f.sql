-- Tenant role enum
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'member');

-- Core tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  locale TEXT NOT NULL DEFAULT 'sv-SE',
  timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_domain ON public.tenants(domain) WHERE domain IS NOT NULL;

-- Branding
CREATE TABLE public.tenant_branding (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0891b2',
  accent_color TEXT,
  style_preset TEXT NOT NULL DEFAULT 'enterprise',
  heading_font TEXT NOT NULL DEFAULT 'Inter',
  body_font TEXT NOT NULL DEFAULT 'Inter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI config
CREATE TABLE public.tenant_ai_config (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  ai_name TEXT NOT NULL DEFAULT 'AI Ekonom',
  ai_tone TEXT NOT NULL DEFAULT 'advisory',
  intro_text TEXT,
  explanation_mode_default TEXT NOT NULL DEFAULT 'simple',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login config
CREATE TABLE public.tenant_login_config (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT 'Välkommen',
  subheadline TEXT,
  trust_bullets JSONB NOT NULL DEFAULT '["Automatisk bokföring","Realtidsanalys","Full revisionslogg","Spårbar AI"]'::jsonb,
  show_bankid BOOLEAN NOT NULL DEFAULT true,
  show_password_login BOOLEAN NOT NULL DEFAULT true,
  support_email TEXT,
  support_url TEXT,
  footer_attribution TEXT DEFAULT 'Powered by NorthLedger',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feature flags
CREATE TABLE public.tenant_feature_flags (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled_modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled_ai_features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled_export_types TEXT[] NOT NULL DEFAULT ARRAY['pdf','excel','sie4']::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Members
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.tenant_role NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- Security definer helpers (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
      AND role IN ('owner','admin')
  );
$$;

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_login_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Policies: tenants
CREATE POLICY "Public can view active tenants by slug"
  ON public.tenants FOR SELECT
  USING (status = 'active');

CREATE POLICY "Tenant admins can update their tenant"
  ON public.tenants FOR UPDATE
  USING (public.is_tenant_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Policies: tenant_branding (publicly readable for login page rendering)
CREATE POLICY "Public can view tenant branding"
  ON public.tenant_branding FOR SELECT USING (true);

CREATE POLICY "Admins can insert branding"
  ON public.tenant_branding FOR INSERT
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Admins can update branding"
  ON public.tenant_branding FOR UPDATE
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Policies: tenant_ai_config (publicly readable for login page AI identity preview)
CREATE POLICY "Public can view tenant AI config"
  ON public.tenant_ai_config FOR SELECT USING (true);

CREATE POLICY "Admins can insert AI config"
  ON public.tenant_ai_config FOR INSERT
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Admins can update AI config"
  ON public.tenant_ai_config FOR UPDATE
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Policies: tenant_login_config (publicly readable)
CREATE POLICY "Public can view login config"
  ON public.tenant_login_config FOR SELECT USING (true);

CREATE POLICY "Admins can insert login config"
  ON public.tenant_login_config FOR INSERT
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Admins can update login config"
  ON public.tenant_login_config FOR UPDATE
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Policies: tenant_feature_flags (members only)
CREATE POLICY "Members can view feature flags"
  ON public.tenant_feature_flags FOR SELECT
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can insert feature flags"
  ON public.tenant_feature_flags FOR INSERT
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Admins can update feature flags"
  ON public.tenant_feature_flags FOR UPDATE
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Policies: tenant_members
CREATE POLICY "Users see their own memberships"
  ON public.tenant_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can add members"
  ON public.tenant_members FOR INSERT
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update members"
  ON public.tenant_members FOR UPDATE
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can remove members"
  ON public.tenant_members FOR DELETE
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Auto-create default config rows + owner membership when a tenant is created
CREATE OR REPLACE FUNCTION public.bootstrap_tenant_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_branding (tenant_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.tenant_ai_config (tenant_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.tenant_login_config (tenant_id, headline, subheadline)
    VALUES (NEW.id, 'Välkommen till ' || NEW.name, 'Din AI-drivna ekonomiplattform för kontroll, automation och insikter')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.tenant_feature_flags (tenant_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
      VALUES (NEW.id, NEW.created_by, 'owner')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bootstrap_tenant
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_tenant_defaults();

-- Updated_at triggers
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_branding_updated BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_ai_config_updated BEFORE UPDATE ON public.tenant_ai_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_login_config_updated BEFORE UPDATE ON public.tenant_login_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tenant_feature_flags_updated BEFORE UPDATE ON public.tenant_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();