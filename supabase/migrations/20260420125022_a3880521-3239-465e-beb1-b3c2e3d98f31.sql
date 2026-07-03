CREATE TABLE public.email_inbox_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  to_address TEXT NOT NULL,
  from_address TEXT,
  subject TEXT,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'processed',
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_inbox_log_company ON public.email_inbox_log(company_id, received_at DESC);
CREATE INDEX idx_email_inbox_log_to ON public.email_inbox_log(to_address);

ALTER TABLE public.email_inbox_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view inbox log"
ON public.email_inbox_log
FOR SELECT
TO authenticated
USING (
  company_id IS NOT NULL
  AND public.has_company_access(auth.uid(), company_id)
);