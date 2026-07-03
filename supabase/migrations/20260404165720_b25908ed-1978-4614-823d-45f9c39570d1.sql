-- Add 'kam' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kam';

-- KAM assignments table
CREATE TABLE IF NOT EXISTS public.kam_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  kam_user_id uuid NOT NULL,
  assigned_by uuid,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, kam_user_id)
);

ALTER TABLE public.kam_assignments ENABLE ROW LEVEL SECURITY;

-- Owners can manage all assignments
CREATE POLICY "Owners manage KAM assignments"
ON public.kam_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- KAMs can view their own assignments
CREATE POLICY "KAMs view own assignments"
ON public.kam_assignments FOR SELECT TO authenticated
USING (kam_user_id = auth.uid());