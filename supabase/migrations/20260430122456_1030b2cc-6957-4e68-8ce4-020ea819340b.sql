ALTER TABLE public.signing_envelopes
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS public_token text;

CREATE UNIQUE INDEX IF NOT EXISTS signing_envelopes_public_token_idx
  ON public.signing_envelopes (public_token)
  WHERE public_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_signing_envelope_by_token(_token text)
RETURNS TABLE (
  id uuid,
  document_type text,
  document_title text,
  status text,
  signatories jsonb,
  payload jsonb,
  sent_at timestamptz,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, document_type, document_title, status, signatories,
         payload, sent_at, completed_at
  FROM public.signing_envelopes
  WHERE public_token = _token
    AND status IN ('pending', 'draft')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_signing_envelope_by_token(text) TO anon, authenticated;