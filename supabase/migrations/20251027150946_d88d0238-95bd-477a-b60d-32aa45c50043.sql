-- Add tax_column field to employees table for Swedish tax table calculations
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS tax_column INTEGER DEFAULT NULL;

COMMENT ON COLUMN employees.tax_column IS 'Column number from Swedish tax table (skattetabell) for tax calculations';