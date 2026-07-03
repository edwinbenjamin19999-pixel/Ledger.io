
-- Add missing columns to existing projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'consulting',
  ADD COLUMN IF NOT EXISTS budget_revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budget_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logged_hours NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID;

-- Create project_transactions table
CREATE TABLE IF NOT EXISTS public.project_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  invoice_id UUID REFERENCES public.invoices(id),
  transaction_type TEXT NOT NULL DEFAULT 'cost',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  auto_linked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project transactions" ON public.project_transactions
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert project transactions" ON public.project_transactions
  FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "Users can update project transactions" ON public.project_transactions
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete project transactions" ON public.project_transactions
  FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())));

-- Function to generate project codes
CREATE OR REPLACE FUNCTION public.generate_project_code(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  SELECT COUNT(*) + 1 INTO v_count FROM projects WHERE company_id = p_company_id AND code LIKE 'P-' || v_year || '-%';
  RETURN 'P-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;
