ALTER TABLE employees ADD COLUMN IF NOT EXISTS birth_date DATE;

COMMENT ON COLUMN employees.birth_date IS 'Used for age-differentiated employer contribution rates (AGI)';