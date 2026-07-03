-- Update subscription tier enum to match pricing tiers
ALTER TYPE subscription_tier RENAME TO subscription_tier_old;
CREATE TYPE subscription_tier AS ENUM ('mini', 'starter', 'pro', 'enterprise');

-- Migrate existing data
ALTER TABLE companies 
  ALTER COLUMN subscription_tier DROP DEFAULT,
  ALTER COLUMN subscription_tier TYPE subscription_tier USING 
    CASE subscription_tier::text
      WHEN 'starter' THEN 'starter'::subscription_tier
      WHEN 'professional' THEN 'pro'::subscription_tier
      WHEN 'enterprise' THEN 'enterprise'::subscription_tier
      ELSE 'mini'::subscription_tier
    END,
  ALTER COLUMN subscription_tier SET DEFAULT 'mini'::subscription_tier;

ALTER TABLE subscriptions
  ALTER COLUMN tier DROP DEFAULT,
  ALTER COLUMN tier TYPE subscription_tier USING
    CASE tier::text
      WHEN 'starter' THEN 'starter'::subscription_tier
      WHEN 'professional' THEN 'pro'::subscription_tier  
      WHEN 'enterprise' THEN 'enterprise'::subscription_tier
      ELSE 'mini'::subscription_tier
    END,
  ALTER COLUMN tier SET DEFAULT 'mini'::subscription_tier;

DROP TYPE subscription_tier_old;

-- Update has_feature function with new tiers
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
      RETURN v_tier IN ('mini', 'starter', 'pro', 'enterprise');
    WHEN 'single_company' THEN
      RETURN v_tier IN ('mini', 'starter', 'pro', 'enterprise');
    WHEN 'ai_automation' THEN
      RETURN v_tier IN ('starter', 'pro', 'enterprise');
    WHEN 'ai_receipts' THEN
      RETURN v_tier IN ('starter', 'pro', 'enterprise');
    WHEN 'bank_integration' THEN
      RETURN v_tier IN ('mini', 'starter', 'pro', 'enterprise');
    WHEN 'multi_company' THEN
      RETURN v_tier IN ('pro', 'enterprise');
    WHEN 'api_access' THEN
      RETURN v_tier IN ('pro', 'enterprise');
    WHEN 'consolidation' THEN
      RETURN v_tier = 'enterprise';
    WHEN 'multi_currency' THEN
      RETURN v_tier = 'enterprise';
    WHEN 'priority_support' THEN
      RETURN v_tier IN ('starter', 'pro', 'enterprise');
    WHEN 'white_label' THEN
      RETURN v_tier IN ('pro', 'enterprise');
    WHEN 'custom_integrations' THEN
      RETURN v_tier = 'enterprise';
    ELSE
      RETURN false;
  END CASE;
END;
$$;