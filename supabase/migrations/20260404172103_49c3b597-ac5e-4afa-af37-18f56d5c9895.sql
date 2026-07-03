
-- Flagged transactions table
CREATE TABLE public.flagged_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text NOT NULL,
  is_reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  auto_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flagged_transactions ENABLE ROW LEVEL SECURITY;

-- Platform admins can see and manage all flags
CREATE POLICY "Platform admins full access to flags"
  ON public.flagged_transactions FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Company users can view their own flags
CREATE POLICY "Company users can view own flags"
  ON public.flagged_transactions FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

-- System/service can insert flags
CREATE POLICY "System can insert flags"
  ON public.flagged_transactions FOR INSERT
  WITH CHECK (true);

-- Function to auto-detect suspicious entries
CREATE OR REPLACE FUNCTION public.flag_suspicious_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_debit numeric;
  total_credit numeric;
  line_count int;
  max_amount numeric;
  has_document boolean;
  duplicate_count int;
BEGIN
  -- Get line totals
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0),
    COUNT(*),
    COALESCE(MAX(GREATEST(debit, credit)), 0)
  INTO total_debit, total_credit, line_count, max_amount
  FROM public.journal_entry_lines
  WHERE journal_entry_id = NEW.id;

  -- Check: Imbalanced entry
  IF ABS(total_debit - total_credit) > 0.01 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'imbalanced', 'critical',
      'Debet och kredit balanserar inte: debet=' || total_debit || ' kredit=' || total_credit);
  END IF;

  -- Check: Unusually large amount (>500k SEK)
  IF max_amount > 500000 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'unusual_amount', 'high',
      'Ovanligt stort belopp: ' || max_amount || ' SEK. Bör granskas.');
  END IF;

  -- Check: Perfectly round large numbers (potential estimate, not real invoice)
  IF max_amount >= 10000 AND max_amount = FLOOR(max_amount) AND MOD(max_amount::bigint, 1000) = 0 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'round_number', 'low',
      'Jämnt belopp (' || max_amount || ' SEK) — kan vara en uppskattning istället för faktiskt underlag.');
  END IF;

  -- Check: Missing document reference
  IF NEW.document_url IS NULL AND NEW.source != 'manual' THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'missing_document', 'medium',
      'Verifikation saknar bifogat underlag.');
  END IF;

  -- Check: Duplicate suspect (same description + total within 24h)
  SELECT COUNT(*) INTO duplicate_count
  FROM public.journal_entries je
  WHERE je.company_id = NEW.company_id
    AND je.id != NEW.id
    AND je.description = NEW.description
    AND je.created_at > (NEW.created_at - interval '24 hours');

  IF duplicate_count > 0 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'duplicate_suspect', 'high',
      'Möjlig dubblett — liknande verifikation hittades inom 24 timmar.');
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on journal_entries after insert or update
CREATE TRIGGER trg_flag_suspicious_entry
  AFTER INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.flag_suspicious_entry();

-- Also allow platform admins to read all companies
CREATE POLICY "Platform admins can view all companies"
  ON public.companies FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- Platform admins can read all journal entries
CREATE POLICY "Platform admins can view all journal entries"
  ON public.journal_entries FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- Platform admins can read all journal entry lines
CREATE POLICY "Platform admins can view all journal entry lines"
  ON public.journal_entry_lines FOR SELECT
  USING (public.is_platform_admin(auth.uid()));
