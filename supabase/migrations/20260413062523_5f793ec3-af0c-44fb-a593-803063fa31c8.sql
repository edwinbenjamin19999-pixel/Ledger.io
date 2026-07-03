CREATE TABLE public.budget_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_plans(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  comment_text TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, budget_id, section_key)
);

ALTER TABLE public.budget_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget comments for their companies"
ON public.budget_comments
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert budget comments for their companies"
ON public.budget_comments
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update budget comments for their companies"
ON public.budget_comments
FOR UPDATE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete budget comments for their companies"
ON public.budget_comments
FOR DELETE
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);