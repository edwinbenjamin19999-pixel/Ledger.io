-- Update employees table with vacation and employment type fields
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'temporary', 'hourly')),
ADD COLUMN IF NOT EXISTS vacation_pay_percentage NUMERIC DEFAULT 12.0;

-- Add comment to explain the fields
COMMENT ON COLUMN public.employees.employment_type IS 'permanent = tillsvidare (får lön under semester), temporary/hourly = visstid/timme (får 12% semesterersättning varje månad)';
COMMENT ON COLUMN public.employees.vacation_days_per_year IS 'Antal semesterdagar per år (25 standard, 30 för 40+, kan justeras individuellt)';
COMMENT ON COLUMN public.employees.vacation_days_used IS 'Antal semesterdagar som använts innevarande år';
COMMENT ON COLUMN public.employees.vacation_pay_percentage IS 'Procentsats för semesterersättning (12% standard för visstid/timme)';

-- Create function to calculate vacation pay for payroll run
CREATE OR REPLACE FUNCTION public.calculate_vacation_pay(
  p_gross_salary NUMERIC,
  p_employment_type TEXT,
  p_vacation_pay_percentage NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Only calculate vacation pay for temporary/hourly employees
  IF p_employment_type IN ('temporary', 'hourly') THEN
    RETURN ROUND(p_gross_salary * (p_vacation_pay_percentage / 100), 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.calculate_vacation_pay IS 'Beräknar semesterersättning baserat på anställningsform. Tillsvidareanställda får 0 kr (de får lön under semester), visstid/timme får % av bruttolön';