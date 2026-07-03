-- VAT AI Reviews: history of AI review runs
CREATE TABLE public.vat_ai_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  verdict TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation TEXT,
  vat_data_snapshot JSONB,
  model_used TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vat_ai_reviews_company_period ON public.vat_ai_reviews(company_id, period_label, created_at DESC);

ALTER TABLE public.vat_ai_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view VAT reviews"
ON public.vat_ai_reviews FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'cfo'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Company members can insert VAT reviews"
ON public.vat_ai_reviews FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'cfo'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- VAT Box Overrides: persistent manual adjustment layer
CREATE TABLE public.vat_box_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  box TEXT NOT NULL,
  override_value NUMERIC NOT NULL,
  original_value NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_label, box)
);

CREATE INDEX idx_vat_box_overrides_company_period ON public.vat_box_overrides(company_id, period_label);

ALTER TABLE public.vat_box_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view VAT overrides"
ON public.vat_box_overrides FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'cfo'::app_role)
  OR has_role(auth.uid(), 'auditor'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Company members can manage VAT overrides"
ON public.vat_box_overrides FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'cfo'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
  OR has_role(auth.uid(), 'cfo'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

CREATE TRIGGER update_vat_box_overrides_updated_at
BEFORE UPDATE ON public.vat_box_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();