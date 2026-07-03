-- Add correction and FK columns to payroll_agi_submissions
ALTER TABLE payroll_agi_submissions
  ADD COLUMN IF NOT EXISTS is_correction BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS corrects_submission_id UUID REFERENCES payroll_agi_submissions(id),
  ADD COLUMN IF NOT EXISTS fk_data JSONB DEFAULT '{}'::jsonb;

-- Update status check to include 'corrected' and 'cancelled'
-- First drop existing constraint if it exists, then add new one
DO $$
BEGIN
  -- Try to drop any existing check constraint on status
  BEGIN
    ALTER TABLE payroll_agi_submissions DROP CONSTRAINT IF EXISTS payroll_agi_submissions_status_check;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  ALTER TABLE payroll_agi_submissions
    ADD CONSTRAINT payroll_agi_submissions_status_check
    CHECK (status IN ('draft', 'ready', 'submitted', 'corrected', 'cancelled'));
END $$;