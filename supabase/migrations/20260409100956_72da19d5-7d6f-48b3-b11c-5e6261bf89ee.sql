
-- Service contracts table
CREATE TABLE public.service_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  contract_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','cancelled','expired','pending_renewal')),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','quarterly','semi_annually','annually')),
  currency TEXT NOT NULL DEFAULT 'SEK',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE,
  next_invoice_date DATE,
  last_invoice_date DATE,
  renewal_type TEXT NOT NULL DEFAULT 'auto' CHECK (renewal_type IN ('auto','manual','none')),
  notice_period_days INTEGER DEFAULT 30,
  indexation_enabled BOOLEAN DEFAULT false,
  indexation_type TEXT CHECK (indexation_type IN ('cpi','fixed_percent','custom')),
  indexation_percent NUMERIC,
  indexation_applied_at DATE,
  churn_risk_score NUMERIC,
  churn_risk_factors JSONB,
  ai_pricing_suggestion JSONB,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contract line items
CREATE TABLE public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.service_contracts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  discount_percent NUMERIC DEFAULT 0,
  vat_code TEXT DEFAULT '25',
  account_number TEXT,
  line_total NUMERIC GENERATED ALWAYS AS (unit_price * quantity * (1 - COALESCE(discount_percent, 0) / 100)) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated invoices from contracts
CREATE TABLE public.contract_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.service_contracts(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generated','sent','paid','failed')),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_service_contracts_company ON public.service_contracts(company_id);
CREATE INDEX idx_service_contracts_status ON public.service_contracts(status);
CREATE INDEX idx_service_contracts_next_invoice ON public.service_contracts(next_invoice_date);
CREATE INDEX idx_contract_items_contract ON public.contract_items(contract_id);
CREATE INDEX idx_contract_invoices_contract ON public.contract_invoices(contract_id);
CREATE INDEX idx_contract_invoices_company ON public.contract_invoices(company_id);

-- RLS
ALTER TABLE public.service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_invoices ENABLE ROW LEVEL SECURITY;

-- service_contracts policies
CREATE POLICY "Company members can view contracts"
  ON public.service_contracts FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Owners and accountants can manage contracts"
  ON public.service_contracts FOR ALL TO authenticated
  USING (
    company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id) OR
      public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  )
  WITH CHECK (
    company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id) OR
      public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

-- contract_items policies
CREATE POLICY "Users can view contract items"
  ON public.contract_items FOR SELECT TO authenticated
  USING (contract_id IN (
    SELECT id FROM public.service_contracts WHERE company_id IN (
      SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid()
    )
  ));

CREATE POLICY "Owners and accountants can manage contract items"
  ON public.contract_items FOR ALL TO authenticated
  USING (contract_id IN (
    SELECT sc.id FROM public.service_contracts sc WHERE
      sc.company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
      AND (
        public.has_role(auth.uid(), 'owner'::app_role, sc.company_id) OR
        public.has_role(auth.uid(), 'accountant'::app_role, sc.company_id)
      )
  ))
  WITH CHECK (contract_id IN (
    SELECT sc.id FROM public.service_contracts sc WHERE
      sc.company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
      AND (
        public.has_role(auth.uid(), 'owner'::app_role, sc.company_id) OR
        public.has_role(auth.uid(), 'accountant'::app_role, sc.company_id)
      )
  ));

-- contract_invoices policies
CREATE POLICY "Company members can view contract invoices"
  ON public.contract_invoices FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Owners and accountants can manage contract invoices"
  ON public.contract_invoices FOR ALL TO authenticated
  USING (
    company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id) OR
      public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  )
  WITH CHECK (
    company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id) OR
      public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

-- Auto-generate contract numbers
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    SELECT COUNT(*) + 1 INTO v_count
    FROM service_contracts
    WHERE company_id = NEW.company_id AND contract_number LIKE 'K-' || v_year || '-%';
    NEW.contract_number := 'K-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_contract_number
  BEFORE INSERT ON public.service_contracts
  FOR EACH ROW EXECUTE FUNCTION public.generate_contract_number();

-- Updated_at trigger
CREATE TRIGGER update_service_contracts_updated_at
  BEFORE UPDATE ON public.service_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
