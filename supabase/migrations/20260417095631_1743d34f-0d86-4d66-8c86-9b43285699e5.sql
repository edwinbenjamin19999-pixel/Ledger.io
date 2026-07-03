CREATE TABLE public.integration_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  notes text,
  contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can register own interest"
  ON public.integration_interest FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own interest"
  ON public.integration_interest FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_integration_interest_platform ON public.integration_interest(platform);
CREATE INDEX idx_integration_interest_user ON public.integration_interest(user_id);