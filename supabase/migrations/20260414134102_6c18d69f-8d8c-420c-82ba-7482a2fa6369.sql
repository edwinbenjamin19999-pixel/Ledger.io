-- Add accounting framework column to companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS accounting_framework text NOT NULL DEFAULT 'K2';

-- Add check constraint for valid values
ALTER TABLE public.companies 
ADD CONSTRAINT chk_accounting_framework 
CHECK (accounting_framework IN ('K2', 'K3'));