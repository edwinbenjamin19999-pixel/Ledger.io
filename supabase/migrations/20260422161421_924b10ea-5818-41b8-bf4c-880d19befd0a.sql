DO $$
DECLARE
  cid uuid := '896995a3-e14b-413d-8e51-1acbfc0f87c7';
BEGIN
  ALTER TABLE public.audit_log DISABLE TRIGGER USER;
  DELETE FROM public.audit_log WHERE company_id = cid;
  ALTER TABLE public.audit_log ENABLE TRIGGER USER;

  DELETE FROM public.companies WHERE id = cid;
END $$;