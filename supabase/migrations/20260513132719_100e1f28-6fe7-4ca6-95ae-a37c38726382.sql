
CREATE TABLE IF NOT EXISTS public.monthly_commentaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  share_token text UNIQUE,
  shared_at timestamptz,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

ALTER TABLE public.monthly_commentaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read commentaries"
ON public.monthly_commentaries FOR SELECT
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Members can insert commentaries"
ON public.monthly_commentaries FOR INSERT
WITH CHECK (has_company_access(auth.uid(), company_id));

CREATE POLICY "Members can update commentaries"
ON public.monthly_commentaries FOR UPDATE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Members can delete commentaries"
ON public.monthly_commentaries FOR DELETE
USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Public can read shared commentaries"
ON public.monthly_commentaries FOR SELECT
USING (share_token IS NOT NULL);

CREATE OR REPLACE FUNCTION public.touch_monthly_commentaries()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_monthly_commentaries ON public.monthly_commentaries;
CREATE TRIGGER trg_touch_monthly_commentaries
BEFORE UPDATE ON public.monthly_commentaries
FOR EACH ROW EXECUTE FUNCTION public.touch_monthly_commentaries();
