CREATE TYPE public.payment_initiation_status AS ENUM (
  'pending', 'redirected', 'authorized', 'executed', 'failed', 'cancelled'
);

CREATE TABLE public.payment_initiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  payment_batch_id UUID,
  provider TEXT NOT NULL DEFAULT 'enable_banking_sandbox',
  provider_payment_id TEXT,
  redirect_url TEXT,
  status public.payment_initiation_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  debtor_iban TEXT,
  creditor_name TEXT,
  creditor_iban TEXT,
  reference TEXT,
  error_message TEXT,
  initiated_by UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_initiations_company ON public.payment_initiations(company_id);
CREATE INDEX idx_payment_initiations_batch ON public.payment_initiations(payment_batch_id);
CREATE INDEX idx_payment_initiations_status ON public.payment_initiations(status);

ALTER TABLE public.payment_initiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view initiations"
ON public.payment_initiations FOR SELECT TO authenticated
USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Company members can create initiations"
ON public.payment_initiations FOR INSERT TO authenticated
WITH CHECK (initiated_by = auth.uid() AND public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Company members can update initiations"
ON public.payment_initiations FOR UPDATE TO authenticated
USING (public.has_company_membership(auth.uid(), company_id));

CREATE TRIGGER update_payment_initiations_updated_at
BEFORE UPDATE ON public.payment_initiations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();