-- AI CFO context-aware conversations and learning loop

CREATE TYPE public.cfo_context_type AS ENUM ('kpi', 'benchmark', 'scenario', 'action', 'general');
CREATE TYPE public.cfo_message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE public.cfo_pref_dimension AS ENUM ('growth_bias', 'cost_focus', 'risk_appetite', 'tone');

-- Conversations
CREATE TABLE public.cfo_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Ny dialog',
  context_type public.cfo_context_type NOT NULL DEFAULT 'general',
  context_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfo_conversations_company ON public.cfo_conversations(company_id, updated_at DESC);
CREATE INDEX idx_cfo_conversations_user ON public.cfo_conversations(user_id);

ALTER TABLE public.cfo_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company CFO conversations"
ON public.cfo_conversations FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create CFO conversations for their company"
ON public.cfo_conversations FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own CFO conversations"
ON public.cfo_conversations FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Users can delete their own CFO conversations"
ON public.cfo_conversations FOR DELETE TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  AND auth.uid() = user_id
);

-- Messages
CREATE TABLE public.cfo_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.cfo_conversations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.cfo_message_role NOT NULL,
  content TEXT NOT NULL,
  structured JSONB,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cfo_messages_conv ON public.cfo_conversation_messages(conversation_id, created_at);

ALTER TABLE public.cfo_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CFO messages for their company"
ON public.cfo_conversation_messages FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert CFO messages for their company"
ON public.cfo_conversation_messages FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update CFO messages for their company"
ON public.cfo_conversation_messages FOR UPDATE TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- User preferences (learning loop)
CREATE TABLE public.cfo_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  dimension public.cfo_pref_dimension NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  evidence_count INT NOT NULL DEFAULT 0,
  last_signal_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id, dimension)
);

CREATE INDEX idx_cfo_prefs_user ON public.cfo_user_preferences(company_id, user_id);

ALTER TABLE public.cfo_user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CFO preferences for their company"
ON public.cfo_user_preferences FOR SELECT TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own CFO preferences"
ON public.cfo_user_preferences FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  AND auth.uid() = user_id
);

CREATE POLICY "Users can update their own CFO preferences"
ON public.cfo_user_preferences FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  AND auth.uid() = user_id
);

-- Update timestamp triggers
CREATE TRIGGER update_cfo_conversations_updated_at
  BEFORE UPDATE ON public.cfo_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cfo_user_preferences_updated_at
  BEFORE UPDATE ON public.cfo_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.cfo_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.cfo_conversation_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cfo_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cfo_conversation_messages;