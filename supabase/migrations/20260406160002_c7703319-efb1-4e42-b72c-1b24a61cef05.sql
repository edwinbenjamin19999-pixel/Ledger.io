
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  budget NUMERIC,
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects for their companies"
  ON public.projects FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can insert projects for their companies"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can update projects for their companies"
  ON public.projects FOR UPDATE TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
