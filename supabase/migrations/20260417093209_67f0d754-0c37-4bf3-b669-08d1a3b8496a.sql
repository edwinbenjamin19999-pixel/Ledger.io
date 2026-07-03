-- Re-create with explicit search_path (warnings 1-4)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND status = 'active'
      AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_tenant_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
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