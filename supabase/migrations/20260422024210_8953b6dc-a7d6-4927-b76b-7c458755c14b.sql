-- Co-signatures: one row per signing session (e.g. onboarding agreement)
CREATE TABLE public.co_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'onboarding_agreement',
  document_version TEXT NOT NULL DEFAULT 'v1',
  signatory_rule_mode TEXT NOT NULL DEFAULT 'sole',
  signatory_rule_text TEXT,
  required_count INT NOT NULL DEFAULT 1 CHECK (required_count BETWEEN 1 AND 5),
  completed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','complete','expired','cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);

CREATE INDEX idx_co_signatures_company ON public.co_signatures(company_id);
CREATE INDEX idx_co_signatures_status ON public.co_signatures(status) WHERE status IN ('pending','partial');

-- Individual signers (initiator + invited co-signers)
CREATE TABLE public.co_signature_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  co_signature_id UUID NOT NULL REFERENCES public.co_signatures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  personal_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('initiator','co_signer')),
  token TEXT NOT NULL UNIQUE,
  user_id UUID,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reminded_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_with_bankid BOOLEAN NOT NULL DEFAULT false,
  ip TEXT,
  user_agent TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_co_signature_signers_session ON public.co_signature_signers(co_signature_id);
CREATE INDEX idx_co_signature_signers_token ON public.co_signature_signers(token);
CREATE INDEX idx_co_signature_signers_email ON public.co_signature_signers(email);

-- Enable RLS
ALTER TABLE public.co_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_signature_signers ENABLE ROW LEVEL SECURITY;

-- co_signatures policies
CREATE POLICY "Company members can view co-signatures"
ON public.co_signatures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = co_signatures.company_id
  )
);

CREATE POLICY "Initiator can create co-signature for own company"
ON public.co_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = co_signatures.company_id
  )
);

-- No client-side UPDATE/DELETE — handled via edge functions with service role

-- co_signature_signers policies
CREATE POLICY "Company members can view signers"
ON public.co_signature_signers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.co_signatures cs
    JOIN public.user_roles ur ON ur.company_id = cs.company_id
    WHERE cs.id = co_signature_signers.co_signature_id
      AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Initiator can insert signers for own session"
ON public.co_signature_signers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.co_signatures cs
    WHERE cs.id = co_signature_signers.co_signature_id
      AND cs.created_by = auth.uid()
  )
);
