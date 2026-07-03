
-- Swish connections table
CREATE TABLE public.swish_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  merchant_number TEXT,
  bank_name TEXT,
  connection_type TEXT NOT NULL DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  certificate_uploaded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.swish_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view swish connections for their companies"
  ON public.swish_connections FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage swish connections for their companies"
  ON public.swish_connections FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Swish payments table
CREATE TABLE public.swish_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  swish_connection_id UUID REFERENCES public.swish_connections(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  sender_phone TEXT,
  sender_name TEXT,
  message TEXT,
  swish_reference TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC,
  booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.swish_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view swish payments for their companies"
  ON public.swish_payments FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage swish payments for their companies"
  ON public.swish_payments FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Swish payment requests table
CREATE TABLE public.swish_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  swish_request_id TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.swish_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view swish payment requests for their companies"
  ON public.swish_payment_requests FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage swish payment requests for their companies"
  ON public.swish_payment_requests FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
