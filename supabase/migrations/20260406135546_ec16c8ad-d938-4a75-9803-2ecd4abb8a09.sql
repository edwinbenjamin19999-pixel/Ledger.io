
-- Fix: Guard automation triggers against null URLs to prevent http_request_queue errors
-- This happens when app.settings.supabase_url is not configured

CREATE OR REPLACE FUNCTION public.trigger_automation_on_journal_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
BEGIN
  -- Only trigger when status becomes 'approved'
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    v_url := current_setting('app.settings.supabase_url', true);
    
    -- Guard: skip if URL is not configured
    IF v_url IS NULL OR v_url = '' THEN
      RAISE LOG 'Skipping automation trigger: app.settings.supabase_url not configured';
      RETURN NEW;
    END IF;
    
    PERFORM net.http_post(
      url := v_url || '/functions/v1/automation-orchestrator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'company_id', NEW.company_id,
        'trigger', 'journal_entry_created',
        'payload', jsonb_build_object(
          'journal_entry_id', NEW.id,
          'entry_date', NEW.entry_date,
          'status', NEW.status
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_automation_on_payroll_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url text;
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    v_url := current_setting('app.settings.supabase_url', true);
    
    -- Guard: skip if URL is not configured
    IF v_url IS NULL OR v_url = '' THEN
      RAISE LOG 'Skipping automation trigger: app.settings.supabase_url not configured';
      RETURN NEW;
    END IF;
    
    PERFORM net.http_post(
      url := v_url || '/functions/v1/automation-orchestrator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'company_id', NEW.company_id,
        'trigger', 'payroll_approved',
        'payload', jsonb_build_object(
          'payroll_run_id', NEW.id
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
