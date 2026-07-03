ALTER TABLE public.audit_log DISABLE TRIGGER USER;
DELETE FROM public.audit_log WHERE company_id = '1841eba7-4daf-4546-bdd2-09c234e6875c';
ALTER TABLE public.audit_log ENABLE TRIGGER USER;
DELETE FROM public.companies WHERE id = '1841eba7-4daf-4546-bdd2-09c234e6875c';