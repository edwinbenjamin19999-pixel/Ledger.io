-- Add 'holding' as a new industry type

-- First, add 'holding' to the industry_type enum
ALTER TYPE industry_type ADD VALUE IF NOT EXISTS 'holding';