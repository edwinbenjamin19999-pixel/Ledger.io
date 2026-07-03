-- Visma connections table (mirror of fortnox_connections)
CREATE TABLE public.visma_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  visma_company_id TEXT,
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visma_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can view visma_connections" ON public.visma_connections
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = visma_connections.company_id)
  );
CREATE POLICY "Company admins can insert visma_connections" ON public.visma_connections
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = visma_connections.company_id)
  );
CREATE POLICY "Company admins can update visma_connections" ON public.visma_connections
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = visma_connections.company_id)
  );
CREATE POLICY "Company admins can delete visma_connections" ON public.visma_connections
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = visma_connections.company_id)
  );

CREATE TABLE public.visma_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

ALTER TABLE public.visma_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own visma_oauth_states" ON public.visma_oauth_states
  FOR SELECT USING (user_id = auth.uid());

CREATE TRIGGER update_visma_connections_updated_at
  BEFORE UPDATE ON public.visma_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();