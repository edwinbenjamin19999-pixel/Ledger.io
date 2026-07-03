CREATE TABLE IF NOT EXISTS public.board_mode_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  insight_id text,
  action text NOT NULL CHECK (action IN ('viewed','ignored','drilled_in','executed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_board_mode_feedback_company ON public.board_mode_feedback(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_mode_feedback_insight ON public.board_mode_feedback(insight_id);

ALTER TABLE public.board_mode_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own company board feedback"
ON public.board_mode_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = board_mode_feedback.company_id
  )
);

CREATE POLICY "Users insert own board feedback"
ON public.board_mode_feedback FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = board_mode_feedback.company_id
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.board_mode_feedback;