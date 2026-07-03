-- 1. Add workflow_state to invoices
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS workflow_state text NOT NULL DEFAULT 'INVOICE_LOGGED';

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_workflow_state_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_workflow_state_check
  CHECK (workflow_state IN (
    'INVOICE_LOGGED','AI_VERIFIED','SUPPLIER_REVIEW_REQUIRED','PRE_ACCOUNTED',
    'IN_APPROVAL_FLOW','APPROVED_FOR_PAYMENT','IN_PAYMENT_PROPOSAL',
    'PAYMENT_SIGNED','PAID','REJECTED','UNDER_INVESTIGATION','BLOCKED_HIGH_RISK'
  ));

CREATE INDEX IF NOT EXISTS idx_invoices_workflow_state ON public.invoices(company_id, workflow_state);

-- 2. Backfill workflow_state from existing data
UPDATE public.invoices SET workflow_state = CASE
  WHEN status::text = 'paid' THEN 'PAID'
  WHEN status::text IN ('cancelled','rejected') THEN 'REJECTED'
  WHEN is_blocked = true THEN 'BLOCKED_HIGH_RISK'
  WHEN status::text = 'attested' THEN 'APPROVED_FOR_PAYMENT'
  WHEN invoice_direction = 'incoming' AND supplier_id IS NULL THEN 'SUPPLIER_REVIEW_REQUIRED'
  WHEN status::text IN ('pending_approval','in_approval') THEN 'IN_APPROVAL_FLOW'
  ELSE 'INVOICE_LOGGED'
END
WHERE workflow_state = 'INVOICE_LOGGED';

-- 3. Trigger to sync workflow_state from status changes + block illegal transitions
CREATE OR REPLACE FUNCTION public.sync_invoice_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_terminal text[] := ARRAY['PAID','REJECTED'];
BEGIN
  -- Force PAID when status becomes paid
  IF NEW.status::text = 'paid' AND (OLD.status IS NULL OR OLD.status::text != 'paid') THEN
    NEW.workflow_state := 'PAID';
  END IF;

  -- Force APPROVED_FOR_PAYMENT when newly attested (unless already further along)
  IF NEW.status::text = 'attested' AND (OLD.status IS NULL OR OLD.status::text != 'attested') THEN
    IF NEW.workflow_state NOT IN ('IN_PAYMENT_PROPOSAL','PAYMENT_SIGNED','PAID') THEN
      NEW.workflow_state := 'APPROVED_FOR_PAYMENT';
    END IF;
  END IF;

  -- Force BLOCKED when is_blocked toggled on
  IF NEW.is_blocked = true AND (OLD.is_blocked IS NULL OR OLD.is_blocked = false) THEN
    IF NEW.workflow_state NOT IN ('PAID','PAYMENT_SIGNED') THEN
      NEW.workflow_state := 'BLOCKED_HIGH_RISK';
    END IF;
  END IF;

  -- Block illegal transitions out of terminal states
  IF OLD.workflow_state = ANY(v_terminal) AND NEW.workflow_state != OLD.workflow_state THEN
    -- Allow PAID to stay PAID, but reject moves backwards
    IF NEW.workflow_state NOT IN ('PAID','REJECTED') THEN
      RAISE EXCEPTION 'Illegal workflow transition: % -> %', OLD.workflow_state, NEW.workflow_state;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_workflow_state ON public.invoices;
CREATE TRIGGER trg_sync_invoice_workflow_state
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_workflow_state();

-- 4. Pre-accounting table
CREATE TABLE IF NOT EXISTS public.invoice_preaccounting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account text,
  vat_code text,
  cost_center text,
  project_code text,
  periodization_plan jsonb,
  confidence numeric DEFAULT 0,
  source text DEFAULT 'ai',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id)
);

ALTER TABLE public.invoice_preaccounting ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view preaccounting" ON public.invoice_preaccounting;
CREATE POLICY "Company members can view preaccounting"
  ON public.invoice_preaccounting FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company members can insert preaccounting" ON public.invoice_preaccounting;
CREATE POLICY "Company members can insert preaccounting"
  ON public.invoice_preaccounting FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company members can update preaccounting" ON public.invoice_preaccounting;
CREATE POLICY "Company members can update preaccounting"
  ON public.invoice_preaccounting FOR UPDATE
  USING (public.has_company_access(auth.uid(), company_id));

CREATE INDEX IF NOT EXISTS idx_invoice_preaccounting_invoice ON public.invoice_preaccounting(invoice_id);

-- 5. Invoice comments table
CREATE TABLE IF NOT EXISTS public.invoice_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view invoice comments" ON public.invoice_comments;
CREATE POLICY "Company members can view invoice comments"
  ON public.invoice_comments FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Authors can insert invoice comments" ON public.invoice_comments;
CREATE POLICY "Authors can insert invoice comments"
  ON public.invoice_comments FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update own comments" ON public.invoice_comments;
CREATE POLICY "Authors can update own comments"
  ON public.invoice_comments FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete own comments" ON public.invoice_comments;
CREATE POLICY "Authors can delete own comments"
  ON public.invoice_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_invoice_comments_invoice ON public.invoice_comments(invoice_id, created_at DESC);

-- 6. Supplier profiles fraud columns
ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS last_bg text,
  ADD COLUMN IF NOT EXISTS last_iban text;