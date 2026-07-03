
-- Create a database function that calls the automation orchestrator
-- when journal entries are approved (either created as approved or updated to approved)
CREATE OR REPLACE FUNCTION public.trigger_automation_on_journal_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when status becomes 'approved'
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    -- Use pg_net to call the orchestrator asynchronously
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/automation-orchestrator',
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
$$;

-- Attach trigger to journal_entries table
DROP TRIGGER IF EXISTS trg_automation_on_journal_approval ON public.journal_entries;
CREATE TRIGGER trg_automation_on_journal_approval
  AFTER INSERT OR UPDATE OF status ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_automation_on_journal_approval();

-- Also trigger automation when payroll is approved
CREATE OR REPLACE FUNCTION public.trigger_automation_on_payroll_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/automation-orchestrator',
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
$$;

DROP TRIGGER IF EXISTS trg_automation_on_payroll_approval ON public.payroll_runs;
CREATE TRIGGER trg_automation_on_payroll_approval
  AFTER UPDATE OF status ON public.payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_automation_on_payroll_approval();

-- Add unique constraint for automation_tasks upsert if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'automation_tasks_company_type_entity_unique'
  ) THEN
    ALTER TABLE public.automation_tasks 
    ADD CONSTRAINT automation_tasks_company_type_entity_unique 
    UNIQUE (company_id, task_type, related_entity_id);
  END IF;
END $$;
