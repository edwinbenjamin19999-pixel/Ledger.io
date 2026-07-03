-- Add series columns to journal_entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS series_code text;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS series_number integer;

-- Create counter table for series numbering
CREATE TABLE IF NOT EXISTS journal_series_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  series_code text NOT NULL,
  fiscal_year integer NOT NULL,
  next_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, series_code, fiscal_year)
);

ALTER TABLE journal_series_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view series counters for their companies" ON journal_series_counters
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can manage series counters for their companies" ON journal_series_counters
  FOR ALL TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid()));

-- Function to assign series number and format journal_number
CREATE OR REPLACE FUNCTION public.assign_journal_series_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year integer;
  v_next integer;
BEGIN
  -- Only process if series_code is set and series_number is not yet assigned
  IF NEW.series_code IS NOT NULL AND NEW.series_number IS NULL THEN
    v_year := EXTRACT(YEAR FROM NEW.entry_date);
    
    -- Get and increment counter atomically
    INSERT INTO journal_series_counters (company_id, series_code, fiscal_year, next_number)
    VALUES (NEW.company_id, NEW.series_code, v_year, 2)
    ON CONFLICT (company_id, series_code, fiscal_year)
    DO UPDATE SET next_number = journal_series_counters.next_number + 1, updated_at = now()
    RETURNING next_number - 1 INTO v_next;
    
    NEW.series_number := v_next;
    NEW.journal_number := NEW.series_code || v_year::text || '-' || lpad(v_next::text, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (before the existing assign_journal_number trigger)
DROP TRIGGER IF EXISTS trigger_assign_journal_series ON journal_entries;
CREATE TRIGGER trigger_assign_journal_series
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION assign_journal_series_number();