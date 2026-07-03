CREATE TABLE IF NOT EXISTS public.vat_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  vat_declaration_id UUID,
  settlement_journal_entry_id UUID,
  payment_journal_entry_id UUID,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  direction TEXT NOT NULL CHECK (direction IN ('payable','receivable')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','paid','refunded','reversed')),
  period_label TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vat_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VAT settlements visible to company members" ON public.vat_settlements;
CREATE POLICY "VAT settlements visible to company members"
ON public.vat_settlements FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = vat_settlements.company_id
  )
);

DROP POLICY IF EXISTS "VAT settlements insertable by company members" ON public.vat_settlements;
CREATE POLICY "VAT settlements insertable by company members"
ON public.vat_settlements FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = vat_settlements.company_id
  )
);

DROP POLICY IF EXISTS "VAT settlements updatable by company members" ON public.vat_settlements;
CREATE POLICY "VAT settlements updatable by company members"
ON public.vat_settlements FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = vat_settlements.company_id
  )
);

CREATE INDEX IF NOT EXISTS idx_vat_settlements_company ON public.vat_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_vat_settlements_declaration ON public.vat_settlements(vat_declaration_id);
CREATE INDEX IF NOT EXISTS idx_vat_settlements_period ON public.vat_settlements(company_id, period_label);

CREATE OR REPLACE FUNCTION public.update_vat_settlements_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_vat_settlements_updated_at ON public.vat_settlements;
CREATE TRIGGER trg_vat_settlements_updated_at
BEFORE UPDATE ON public.vat_settlements
FOR EACH ROW EXECUTE FUNCTION public.update_vat_settlements_updated_at();