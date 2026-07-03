-- 1. Add deprecated column to chart_of_accounts
ALTER TABLE public.chart_of_accounts 
ADD COLUMN IF NOT EXISTS deprecated boolean NOT NULL DEFAULT false;

-- 2. Mark deprecated accounts
UPDATE public.chart_of_accounts 
SET deprecated = true 
WHERE account_number IN ('2610', '2640', '3000', '4000', '2990', '1790');

-- 3. Create accounting_periods table
CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'archived')),
  locked_by uuid,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, year, month)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view periods for their companies"
ON public.accounting_periods FOR SELECT TO authenticated
USING (company_id IN (
  SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
));

CREATE POLICY "Users can manage periods for their companies"
ON public.accounting_periods FOR ALL TO authenticated
USING (company_id IN (
  SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
));

-- 4. Create immutable audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  previous_state jsonb,
  new_state jsonb,
  ip_address text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read audit log for their companies"
ON public.audit_log FOR SELECT TO authenticated
USING (company_id IN (
  SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
));

CREATE POLICY "Users can insert audit log entries"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 5. Prevent UPDATE and DELETE on audit_log (immutability)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Revisionsloggen är oföränderlig — rader kan inte uppdateras eller raderas.';
END;
$$;

CREATE TRIGGER prevent_audit_log_update
BEFORE UPDATE ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_modification();

CREATE TRIGGER prevent_audit_log_delete
BEFORE DELETE ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_log_modification();