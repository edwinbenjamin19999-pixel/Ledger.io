DO $$
DECLARE
  c uuid := '12757b00-e603-496a-8726-966e4092a7c4';
  r record;
BEGIN
  ALTER TABLE public.audit_log DISABLE TRIGGER USER;

  FOR r IN
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public' AND ccu.table_name = 'companies' AND ccu.column_name = 'id'
      AND tc.table_schema = 'public' AND tc.table_name <> 'companies'
  LOOP
    EXECUTE format('DELETE FROM %I.%I WHERE %I = $1', r.table_schema, r.table_name, r.column_name) USING c;
  END LOOP;

  DELETE FROM public.companies WHERE id = c;

  ALTER TABLE public.audit_log ENABLE TRIGGER USER;
END $$;