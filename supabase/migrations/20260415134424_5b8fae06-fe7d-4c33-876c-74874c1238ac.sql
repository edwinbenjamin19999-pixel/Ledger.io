
DO $$
DECLARE
  v_company_ids uuid[] := ARRAY['607981ad-160e-49fc-a0b6-80b3add15956', '0270276d-4f23-40c3-b894-9bbf3ff70c67'];
  v_user_ids uuid[] := ARRAY['818b11f7-484c-439a-a93e-36f4b7e90a07', 'ade8a22d-9edf-4cd7-89f4-2d57c3b6512a'];
  v_cid uuid;
  v_tbl text;
BEGIN
  FOREACH v_cid IN ARRAY v_company_ids LOOP
    -- Delete all company-dependent data
    FOR v_tbl IN 
      SELECT table_name FROM information_schema.columns 
      WHERE column_name = 'company_id' 
        AND table_schema = 'public' 
        AND table_name != 'companies'
      GROUP BY table_name
    LOOP
      EXECUTE format('DELETE FROM public.%I WHERE company_id = $1', v_tbl) USING v_cid;
    END LOOP;
  END LOOP;

  -- Delete companies
  DELETE FROM companies WHERE id = ANY(v_company_ids);

  -- Delete user roles
  DELETE FROM user_roles WHERE user_id = ANY(v_user_ids);
  
  -- Delete ai conversations
  DELETE FROM ai_conversations WHERE user_id = ANY(v_user_ids);
  
  -- Delete account deletion requests
  DELETE FROM account_deletion_requests WHERE user_id = ANY(v_user_ids);

  -- Delete profiles (now safe since companies are gone)
  DELETE FROM profiles WHERE id = ANY(v_user_ids);
  
  -- Delete auth users
  DELETE FROM auth.users WHERE id = ANY(v_user_ids);
END $$;
