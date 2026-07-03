-- ============================================================
-- AP Ledger v4 — Fraud-aware supplier invoice control system
-- ============================================================

-- 1. Extend invoice_status enum with 'blocked'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='invoice_status')
      AND enumlabel = 'blocked'
  ) THEN
    ALTER TYPE invoice_status ADD VALUE 'blocked';
  END IF;
END$$;

-- 2. Extend invoices with risk + AI fields
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'safe' CHECK (risk_level IN ('safe','warning','high')),
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS periodization_plan jsonb,
  ADD COLUMN IF NOT EXISTS vat_code text,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS bg_pg text,
  ADD COLUMN IF NOT EXISTS risk_last_evaluated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_invoices_is_blocked ON public.invoices(company_id, is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_invoices_risk_level ON public.invoices(company_id, risk_level);

-- 3. Supplier baseline profiles
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE,
  org_number text,
  supplier_name text NOT NULL,
  known_bg_pg text[] DEFAULT '{}'::text[],
  avg_amount numeric(15,2),
  invoice_count integer NOT NULL DEFAULT 0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_confirmed boolean NOT NULL DEFAULT false,
  confirmed_by uuid REFERENCES public.profiles(id),
  confirmed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_profiles_company_orgname
  ON public.supplier_profiles(company_id, COALESCE(org_number, ''), supplier_name);

CREATE INDEX IF NOT EXISTS idx_supplier_profiles_company ON public.supplier_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_org ON public.supplier_profiles(company_id, org_number);

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view supplier profiles for their companies"
  ON public.supplier_profiles FOR SELECT TO authenticated
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage supplier profiles for their companies"
  ON public.supplier_profiles FOR ALL TO authenticated
  USING (has_company_access(auth.uid(), company_id))
  WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE TRIGGER update_supplier_profiles_updated_at
  BEFORE UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Risk signals — one per detected anomaly
CREATE TABLE IF NOT EXISTS public.invoice_risk_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('new_supplier','bg_changed','amount_anomaly','duplicate','overbilling','missing_data','frequency_anomaly')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  score_contribution integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_signals_invoice ON public.invoice_risk_signals(invoice_id);
CREATE INDEX IF NOT EXISTS idx_risk_signals_company_unresolved ON public.invoice_risk_signals(company_id, resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE public.invoice_risk_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk signals for their companies"
  ON public.invoice_risk_signals FOR SELECT TO authenticated
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can manage risk signals for their companies"
  ON public.invoice_risk_signals FOR ALL TO authenticated
  USING (has_company_access(auth.uid(), company_id))
  WITH CHECK (has_company_access(auth.uid(), company_id));

-- 5. Override audit log
CREATE TABLE IF NOT EXISTS public.invoice_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  override_type text NOT NULL CHECK (override_type IN ('block_release','risk_acknowledge','bg_confirm','supplier_confirm','sign_anyway')),
  reason text NOT NULL,
  risk_score_at_override integer,
  signals_snapshot jsonb,
  signed_at timestamptz NOT NULL DEFAULT now(),
  bankid_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_overrides_invoice ON public.invoice_overrides(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_overrides_company ON public.invoice_overrides(company_id, signed_at DESC);

ALTER TABLE public.invoice_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view overrides for their companies"
  ON public.invoice_overrides FOR SELECT TO authenticated
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert overrides for their companies"
  ON public.invoice_overrides FOR INSERT TO authenticated
  WITH CHECK (has_company_access(auth.uid(), company_id) AND user_id = auth.uid());

-- 6. Hard guard — blocked invoice cannot be marked paid without signed override
CREATE OR REPLACE FUNCTION public.guard_blocked_invoice_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.is_blocked = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.invoice_overrides
      WHERE invoice_id = NEW.id
        AND override_type = 'sign_anyway'
        AND signed_at > now() - interval '24 hours'
    ) THEN
      RAISE EXCEPTION 'Blockerad faktura kan inte markeras som betald utan signerad override (sign_anyway)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_blocked_invoice_payment_trg ON public.invoices;
CREATE TRIGGER guard_blocked_invoice_payment_trg
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_blocked_invoice_payment();
