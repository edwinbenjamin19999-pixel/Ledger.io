
-- Tax declarations table
CREATE TABLE public.tax_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  declaration_type TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  period TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  skatteverket_reference TEXT,
  ai_prepared_at TIMESTAMPTZ,
  ai_confidence_score INTEGER,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_declarations_lookup ON public.tax_declarations (company_id, declaration_type, tax_year);
CREATE INDEX idx_tax_declarations_status ON public.tax_declarations (company_id, status);

ALTER TABLE public.tax_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax declarations for their companies"
  ON public.tax_declarations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND company_id = tax_declarations.company_id));

CREATE POLICY "Users can create tax declarations for their companies"
  ON public.tax_declarations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND company_id = tax_declarations.company_id));

CREATE POLICY "Users can update tax declarations for their companies"
  ON public.tax_declarations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND company_id = tax_declarations.company_id));

CREATE POLICY "Users can delete tax declarations for their companies"
  ON public.tax_declarations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND company_id = tax_declarations.company_id));

-- Tax declaration adjustments table (audit trail)
CREATE TABLE public.tax_declaration_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  declaration_id UUID NOT NULL REFERENCES public.tax_declarations(id) ON DELETE CASCADE,
  field_code TEXT NOT NULL,
  original_ai_value NUMERIC,
  adjusted_value NUMERIC,
  adjustment_reason TEXT,
  adjusted_by UUID NOT NULL,
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tax_decl_adj_lookup ON public.tax_declaration_adjustments (declaration_id, field_code);

ALTER TABLE public.tax_declaration_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view adjustments for their declarations"
  ON public.tax_declaration_adjustments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tax_declarations td
    JOIN public.user_roles ur ON ur.company_id = td.company_id
    WHERE td.id = tax_declaration_adjustments.declaration_id AND ur.user_id = auth.uid()
  ));

CREATE POLICY "Users can create adjustments"
  ON public.tax_declaration_adjustments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tax_declarations td
    JOIN public.user_roles ur ON ur.company_id = td.company_id
    WHERE td.id = tax_declaration_adjustments.declaration_id AND ur.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_tax_declarations_updated_at
  BEFORE UPDATE ON public.tax_declarations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
