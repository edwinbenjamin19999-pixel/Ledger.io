-- Fortnox OAuth connections per company
CREATE TABLE public.fortnox_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  fortnox_company_id TEXT,
  scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fortnox_connections ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write Fortnox tokens
CREATE POLICY "Admins can view fortnox connections"
ON public.fortnox_connections FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert fortnox connections"
ON public.fortnox_connections FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update fortnox connections"
ON public.fortnox_connections FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete fortnox connections"
ON public.fortnox_connections FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_fortnox_connections_updated_at
BEFORE UPDATE ON public.fortnox_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fortnox_connections_company ON public.fortnox_connections(company_id);

-- Short-lived OAuth state tokens (CSRF)
CREATE TABLE public.fortnox_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.fortnox_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own oauth states"
ON public.fortnox_oauth_states FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());