-- Fix the auto_log_sensitive_access trigger to handle NULL auth.uid()
CREATE OR REPLACE FUNCTION public.auto_log_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if we have a valid user context (skip during migrations/service role operations)
  IF auth.uid() IS NOT NULL THEN
    IF TG_TABLE_NAME = 'employees' THEN
      INSERT INTO public.audit_events (
        user_id,
        entity_type,
        entity_id,
        event_type,
        data_subject_id,
        data_categories,
        processing_purpose,
        legal_basis
      ) VALUES (
        auth.uid(),
        'employee',
        NEW.id,
        TG_OP,
        NEW.id,
        ARRAY['personal_identity', 'financial', 'employment'],
        'HR and payroll management',
        'contract'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also fix the log_data_access function to handle NULL user
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_user_id uuid, 
  p_entity_type text, 
  p_entity_id uuid, 
  p_action text, 
  p_data_categories text[], 
  p_purpose text DEFAULT NULL::text, 
  p_legal_basis text DEFAULT 'legitimate_interest'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_audit_id UUID;
  v_current_user UUID;
BEGIN
  v_current_user := auth.uid();
  
  -- Skip logging if no authenticated user
  IF v_current_user IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.audit_events (
    user_id,
    entity_type,
    entity_id,
    event_type,
    data_subject_id,
    data_categories,
    processing_purpose,
    legal_basis,
    company_id
  ) VALUES (
    v_current_user,
    p_entity_type,
    p_entity_id,
    p_action,
    p_user_id,
    p_data_categories,
    p_purpose,
    p_legal_basis,
    NULL
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;