
CREATE TABLE public.kivra_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_key TEXT,
  is_active BOOLEAN DEFAULT false,
  default_delivery_method TEXT DEFAULT 'kivra',
  send_invoices BOOLEAN DEFAULT true,
  send_payroll_slips BOOLEAN DEFAULT true,
  send_documents BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kivra_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company kivra settings"
  ON public.kivra_settings FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Owners can manage kivra settings"
  ON public.kivra_settings FOR ALL TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'cfo')))
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('owner', 'cfo')));

CREATE TABLE public.kivra_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  recipient_ssn TEXT,
  recipient_org_number TEXT,
  content_type TEXT NOT NULL DEFAULT 'invoice',
  kivra_content_id TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.kivra_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company kivra deliveries"
  ON public.kivra_deliveries FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can create kivra deliveries"
  ON public.kivra_deliveries FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
