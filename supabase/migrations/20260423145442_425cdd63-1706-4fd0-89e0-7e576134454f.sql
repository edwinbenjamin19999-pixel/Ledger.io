-- Extend supplier_profiles with rolling baseline columns
ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS avg_amount_12m numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stddev_amount_12m numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_amount numeric,
  ADD COLUMN IF NOT EXISTS last_invoice_date date,
  ADD COLUMN IF NOT EXISTS typical_interval_days int,
  ADD COLUMN IF NOT EXISTS invoice_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;

-- New table: supplier_contracts
CREATE TABLE IF NOT EXISTS public.supplier_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.supplier_profiles(id) ON DELETE CASCADE,
  monthly_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SEK',
  valid_from date NOT NULL,
  valid_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_company ON public.supplier_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier ON public.supplier_contracts(supplier_id);

ALTER TABLE public.supplier_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier contracts for their companies"
  ON public.supplier_contracts FOR SELECT TO authenticated
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage supplier contracts for their companies"
  ON public.supplier_contracts FOR ALL TO authenticated
  USING (has_company_access(auth.uid(), company_id))
  WITH CHECK (has_company_access(auth.uid(), company_id));

-- Recompute supplier baseline when invoice becomes paid
CREATE OR REPLACE FUNCTION public.update_supplier_profile_on_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id uuid;
  v_avg numeric;
  v_stddev numeric;
  v_count int;
  v_last_amount numeric;
  v_last_date date;
  v_interval int;
BEGIN
  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  v_supplier_id := NEW.supplier_id;
  IF v_supplier_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(AVG(total_amount), 0),
    COALESCE(STDDEV_POP(total_amount), 0),
    COUNT(*)
  INTO v_avg, v_stddev, v_count
  FROM public.invoices
  WHERE supplier_id = v_supplier_id
    AND company_id = NEW.company_id
    AND status = 'paid'
    AND invoice_date >= (CURRENT_DATE - INTERVAL '12 months');

  SELECT total_amount, invoice_date
  INTO v_last_amount, v_last_date
  FROM public.invoices
  WHERE supplier_id = v_supplier_id
    AND company_id = NEW.company_id
    AND status = 'paid'
  ORDER BY invoice_date DESC
  LIMIT 1;

  SELECT ROUND(AVG(diff_days))::int INTO v_interval
  FROM (
    SELECT EXTRACT(EPOCH FROM (invoice_date::timestamp - LAG(invoice_date::timestamp) OVER (ORDER BY invoice_date)))/86400 AS diff_days
    FROM public.invoices
    WHERE supplier_id = v_supplier_id
      AND company_id = NEW.company_id
      AND status = 'paid'
    ORDER BY invoice_date DESC
    LIMIT 6
  ) t
  WHERE diff_days IS NOT NULL AND diff_days BETWEEN 5 AND 400;

  UPDATE public.supplier_profiles
  SET avg_amount_12m = v_avg,
      stddev_amount_12m = v_stddev,
      last_amount = v_last_amount,
      last_invoice_date = v_last_date,
      typical_interval_days = v_interval,
      invoice_count = v_count,
      updated_at = now()
  WHERE id = v_supplier_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_supplier_profile_on_paid ON public.invoices;
CREATE TRIGGER trg_update_supplier_profile_on_paid
AFTER INSERT OR UPDATE OF status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_supplier_profile_on_invoice_paid();

-- Strengthen payment guard: also block on unresolved high-severity overbilling
CREATE OR REPLACE FUNCTION public.guard_blocked_invoice_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    IF NEW.is_blocked = true THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.invoice_overrides
        WHERE invoice_id = NEW.id AND override_type = 'sign_anyway'
      ) THEN
        RAISE EXCEPTION 'Blockerad faktura kan inte markeras som betald utan signerad override';
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.invoice_risk_signals
      WHERE invoice_id = NEW.id
        AND kind = 'overbilling'
        AND severity = 'high'
        AND resolved_at IS NULL
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.invoice_overrides
        WHERE invoice_id = NEW.id
          AND override_type IN ('accept_deviation', 'sign_anyway')
      ) THEN
        RAISE EXCEPTION 'Hög prisavvikelse måste accepteras eller signeras innan betalning';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
