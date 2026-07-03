
-- Add rejection reason and model version tracking to bank_transactions
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS ai_model_version text;

-- Add model version tracking to ai_feedback
ALTER TABLE public.ai_feedback
  ADD COLUMN IF NOT EXISTS ai_model_version text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;
