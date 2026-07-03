
CREATE TABLE IF NOT EXISTS public.firm_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin','consultant','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, email, status)
);

CREATE INDEX IF NOT EXISTS idx_firm_invitations_token ON public.firm_invitations(token);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_firm ON public.firm_invitations(firm_id);

ALTER TABLE public.firm_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Firm admins manage invitations"
    ON public.firm_invitations
    FOR ALL TO authenticated
    USING (public.is_firm_admin(auth.uid(), firm_id))
    WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view invitation by token"
    ON public.firm_invitations
    FOR SELECT TO anon, authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
