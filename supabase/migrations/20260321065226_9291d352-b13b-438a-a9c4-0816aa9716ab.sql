
-- Drop the function that was created (trigger failed so doesn't exist)
DROP FUNCTION IF EXISTS public.assign_journal_number() CASCADE;

-- Create function to auto-assign journal_number per company (text type)
CREATE OR REPLACE FUNCTION public.assign_journal_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  IF NEW.journal_number IS NULL OR NEW.journal_number = '' THEN
    SELECT COALESCE(MAX(NULLIF(journal_number, '')::INTEGER), 0) + 1
    INTO next_number
    FROM public.journal_entries
    WHERE company_id = NEW.company_id
      AND journal_number IS NOT NULL
      AND journal_number ~ '^\d+$';
    
    IF next_number IS NULL THEN
      next_number := 1;
    END IF;
    
    NEW.journal_number := next_number::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER assign_journal_number_trigger
BEFORE INSERT ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.assign_journal_number();

-- Backfill existing NULL journal_numbers
WITH numbered AS (
  SELECT id, company_id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY entry_date, created_at) as rn
  FROM public.journal_entries
  WHERE journal_number IS NULL OR journal_number = ''
)
UPDATE public.journal_entries je
SET journal_number = numbered.rn::TEXT
FROM numbered
WHERE je.id = numbered.id;
