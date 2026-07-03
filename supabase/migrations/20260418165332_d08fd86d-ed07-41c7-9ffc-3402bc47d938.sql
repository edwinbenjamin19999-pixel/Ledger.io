DO $$ BEGIN
  CREATE TYPE public.cfo_action_type AS ENUM ('create_accrual','send_reminder','reclassify','apply_deferral','generate_report');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cfo_action_status AS ENUM ('pending','executed','failed','reverted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cfo_automation_mode AS ENUM ('manual','assisted','autonomous');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cfo_persona_mode AS ENUM ('business_owner','accountant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ai_economist_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insight_id text,
  action_type public.cfo_action_type NOT NULL,
  status public.cfo_action_status NOT NULL DEFAULT 'pending',
  automation_mode public.cfo_automation_mode NOT NULL DEFAULT 'manual',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  financial_impact numeric,
  confidence numeric,
  title text,
  executed_by uuid,
  executed_at timestamptz,
  reverted_at timestamptz,
  reverted_by uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_economist_actions_company_created
  ON public.ai_economist_actions(company_id, created_at DESC);

ALTER TABLE public.ai_economist_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can view ai economist actions" ON public.ai_economist_actions;
CREATE POLICY "authenticated can view ai economist actions"
  ON public.ai_economist_actions FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated can insert ai economist actions" ON public.ai_economist_actions;
CREATE POLICY "authenticated can insert ai economist actions"
  ON public.ai_economist_actions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated can update ai economist actions" ON public.ai_economist_actions;
CREATE POLICY "authenticated can update ai economist actions"
  ON public.ai_economist_actions FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.ai_economist_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  automation_mode public.cfo_automation_mode NOT NULL DEFAULT 'assisted',
  persona_mode public.cfo_persona_mode NOT NULL DEFAULT 'business_owner',
  auto_execute_threshold numeric NOT NULL DEFAULT 0.9,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

ALTER TABLE public.ai_economist_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own ai economist settings" ON public.ai_economist_settings;
CREATE POLICY "users manage own ai economist settings"
  ON public.ai_economist_settings FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_ai_economist_actions_updated ON public.ai_economist_actions;
CREATE TRIGGER trg_ai_economist_actions_updated
  BEFORE UPDATE ON public.ai_economist_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ai_economist_settings_updated ON public.ai_economist_settings;
CREATE TRIGGER trg_ai_economist_settings_updated
  BEFORE UPDATE ON public.ai_economist_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_economist_actions REPLICA IDENTITY FULL;
ALTER TABLE public.ai_economist_settings REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ai_economist_actions';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_economist_actions';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ai_economist_settings';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_economist_settings';
  END IF;
END $$;