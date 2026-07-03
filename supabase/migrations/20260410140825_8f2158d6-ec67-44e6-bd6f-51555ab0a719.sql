
-- Budget AI sessions for conversational budget building
CREATE TABLE IF NOT EXISTS public.budget_ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES public.budget_plans(id) ON DELETE CASCADE NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_activity timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget AI sessions for their company budgets"
ON public.budget_ai_sessions FOR ALL TO authenticated
USING (
  budget_id IN (
    SELECT bp.id FROM public.budget_plans bp
    JOIN public.user_roles ur ON ur.company_id = bp.company_id
    WHERE ur.user_id = auth.uid()
  )
)
WITH CHECK (
  budget_id IN (
    SELECT bp.id FROM public.budget_plans bp
    JOIN public.user_roles ur ON ur.company_id = bp.company_id
    WHERE ur.user_id = auth.uid()
  )
);

-- Budget scenarios table
CREATE TABLE IF NOT EXISTS public.budget_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid REFERENCES public.budget_plans(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Basfall',
  growth_pct numeric NOT NULL DEFAULT 0,
  cost_pct numeric NOT NULL DEFAULT 0,
  assumptions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget scenarios for their company budgets"
ON public.budget_scenarios FOR ALL TO authenticated
USING (
  budget_id IN (
    SELECT bp.id FROM public.budget_plans bp
    JOIN public.user_roles ur ON ur.company_id = bp.company_id
    WHERE ur.user_id = auth.uid()
  )
)
WITH CHECK (
  budget_id IN (
    SELECT bp.id FROM public.budget_plans bp
    JOIN public.user_roles ur ON ur.company_id = bp.company_id
    WHERE ur.user_id = auth.uid()
  )
);

-- Forecast accuracy tracking
CREATE TABLE IF NOT EXISTS public.forecast_accuracy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  forecast_month text NOT NULL,
  forecasted_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric,
  account_class text NOT NULL,
  error_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_accuracy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage forecast accuracy for their company"
ON public.forecast_accuracy FOR ALL TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
);

-- Industry benchmarks (seeded data for AI suggestions)
CREATE TABLE IF NOT EXISTS public.industry_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  account_class text NOT NULL,
  label text NOT NULL,
  median_pct_of_revenue numeric NOT NULL DEFAULT 0,
  p25_pct numeric,
  p75_pct numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read industry benchmarks"
ON public.industry_benchmarks FOR SELECT TO authenticated USING (true);

-- Seed industry benchmarks for common Swedish sectors
INSERT INTO public.industry_benchmarks (sector, account_class, label, median_pct_of_revenue, p25_pct, p75_pct) VALUES
('IT/SaaS', '4000-4999', 'Råvaror & handelsvaror', 5, 2, 12),
('IT/SaaS', '5000-6999', 'Externa kostnader', 18, 12, 25),
('IT/SaaS', '7000-7699', 'Personalkostnader', 45, 35, 55),
('IT/SaaS', '7800-7899', 'Avskrivningar', 5, 2, 10),
('Handel', '4000-4999', 'Råvaror & handelsvaror', 55, 45, 65),
('Handel', '5000-6999', 'Externa kostnader', 15, 10, 22),
('Handel', '7000-7699', 'Personalkostnader', 18, 12, 25),
('Handel', '7800-7899', 'Avskrivningar', 3, 1, 5),
('Tjänst', '4000-4999', 'Råvaror & handelsvaror', 10, 3, 20),
('Tjänst', '5000-6999', 'Externa kostnader', 20, 14, 28),
('Tjänst', '7000-7699', 'Personalkostnader', 50, 40, 60),
('Tjänst', '7800-7899', 'Avskrivningar', 3, 1, 6),
('Produktion', '4000-4999', 'Råvaror & handelsvaror', 45, 35, 55),
('Produktion', '5000-6999', 'Externa kostnader', 15, 10, 22),
('Produktion', '7000-7699', 'Personalkostnader', 25, 18, 35),
('Produktion', '7800-7899', 'Avskrivningar', 8, 4, 14),
('Bygg', '4000-4999', 'Råvaror & handelsvaror', 40, 30, 50),
('Bygg', '5000-6999', 'Externa kostnader', 18, 12, 25),
('Bygg', '7000-7699', 'Personalkostnader', 30, 22, 40),
('Bygg', '7800-7899', 'Avskrivningar', 6, 3, 10),
('Restaurang', '4000-4999', 'Råvaror & handelsvaror', 32, 25, 40),
('Restaurang', '5000-6999', 'Externa kostnader', 22, 16, 30),
('Restaurang', '7000-7699', 'Personalkostnader', 35, 28, 42),
('Restaurang', '7800-7899', 'Avskrivningar', 4, 2, 7)
ON CONFLICT DO NOTHING;
