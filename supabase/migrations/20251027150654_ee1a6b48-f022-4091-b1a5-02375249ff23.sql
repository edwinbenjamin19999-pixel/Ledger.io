-- Fix security warning: Set search_path on calculate_vacation_pay function
CREATE OR REPLACE FUNCTION public.calculate_vacation_pay(
  p_gross_salary NUMERIC,
  p_employment_type TEXT,
  p_vacation_pay_percentage NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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