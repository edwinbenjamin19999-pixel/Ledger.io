
-- Prevent duplicate payroll runs for the same period and company
-- First, clean up existing duplicates by keeping only the latest one per period
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY company_id, period_start, period_end 
    ORDER BY created_at DESC
  ) as rn
  FROM public.payroll_runs
  WHERE status IN ('draft', 'approved')
)
DELETE FROM public.payroll_runs 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_payroll_runs_unique_period 
ON public.payroll_runs (company_id, period_start, period_end) 
WHERE status NOT IN ('cancelled', 'rejected');
