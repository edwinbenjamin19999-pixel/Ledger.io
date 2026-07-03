CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_declarations_unique_type_year 
ON public.tax_declarations (company_id, declaration_type, tax_year) 
WHERE period IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_declarations_unique_type_year_period
ON public.tax_declarations (company_id, declaration_type, tax_year, period) 
WHERE period IS NOT NULL;