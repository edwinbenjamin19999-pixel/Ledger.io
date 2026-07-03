-- Create subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');

-- Create subscription status enum (kompatibelt med Stripe)
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'cancelled', 'past_due', 'unpaid');

-- Add subscription columns to companies table
ALTER TABLE companies 
ADD COLUMN subscription_tier subscription_tier DEFAULT 'starter',
ADD COLUMN subscription_status subscription_status DEFAULT 'active',
ADD COLUMN subscription_start_date timestamp with time zone DEFAULT now(),
ADD COLUMN subscription_end_date timestamp with time zone,
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text,
ADD COLUMN monthly_price numeric DEFAULT 0,
ADD COLUMN billing_email text;

-- Create subscriptions table for history and flexibility
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  monthly_price numeric NOT NULL,
  billing_cycle text DEFAULT 'monthly',
  stripe_subscription_id text,
  stripe_price_id text,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Owners can view their subscriptions"
  ON subscriptions FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owners can update their subscriptions"
  ON subscriptions FOR UPDATE
  USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check subscription features
CREATE OR REPLACE FUNCTION has_feature(
  _company_id uuid,
  _feature text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier subscription_tier;
  v_status subscription_status;
BEGIN
  SELECT subscription_tier, subscription_status
  INTO v_tier, v_status
  FROM companies
  WHERE id = _company_id;
  
  -- Check if subscription is active
  IF v_status NOT IN ('active', 'trialing') THEN
    RETURN false;
  END IF;
  
  -- Feature access by tier
  CASE _feature
    WHEN 'basic_accounting' THEN
      RETURN v_tier IN ('starter', 'professional', 'enterprise');
    WHEN 'bank_integration' THEN
      RETURN v_tier IN ('professional', 'enterprise');
    WHEN 'ai_automation' THEN
      RETURN v_tier IN ('professional', 'enterprise');
    WHEN 'multi_company' THEN
      RETURN v_tier IN ('professional', 'enterprise');
    WHEN 'consolidation' THEN
      RETURN v_tier = 'enterprise';
    WHEN 'api_access' THEN
      RETURN v_tier = 'enterprise';
    WHEN 'priority_support' THEN
      RETURN v_tier IN ('professional', 'enterprise');
    WHEN 'custom_integrations' THEN
      RETURN v_tier = 'enterprise';
    ELSE
      RETURN false;
  END CASE;
END;
$$;

COMMENT ON FUNCTION has_feature IS 'Check if a company has access to a specific feature based on their subscription tier';

-- Insert initial subscription for existing companies
INSERT INTO subscriptions (company_id, tier, status, monthly_price, billing_cycle)
SELECT id, 'starter'::subscription_tier, 'active'::subscription_status, 0, 'monthly'
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.company_id = companies.id
);