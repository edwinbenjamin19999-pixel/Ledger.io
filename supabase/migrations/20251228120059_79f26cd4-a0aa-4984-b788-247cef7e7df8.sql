
-- Add subscription fields to groups table
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'mini'::subscription_tier,
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'active'::subscription_status,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS monthly_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS billing_company_id UUID REFERENCES public.companies(id);

-- Update has_feature to check group subscription if company is in a group
CREATE OR REPLACE FUNCTION public.has_feature(_company_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tier subscription_tier;
  v_status subscription_status;
  v_group_id uuid;
BEGIN
  -- First check if company is in a group
  SELECT group_id INTO v_group_id
  FROM companies
  WHERE id = _company_id;
  
  -- If in a group, use group's subscription
  IF v_group_id IS NOT NULL THEN
    SELECT subscription_tier, subscription_status
    INTO v_tier, v_status
    FROM groups
    WHERE id = v_group_id;
  ELSE
    -- Otherwise use company's own subscription
    SELECT subscription_tier, subscription_status
    INTO v_tier, v_status
    FROM companies
    WHERE id = _company_id;
  END IF;
  
  -- Check if subscription is active
  IF v_status IS NULL OR v_status NOT IN ('active', 'trialing') THEN
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
$function$;

-- Create helper function to get effective subscription for a company
CREATE OR REPLACE FUNCTION public.get_effective_subscription(_company_id uuid)
RETURNS TABLE(
  tier subscription_tier,
  status subscription_status,
  is_group_subscription boolean,
  group_id uuid,
  group_name text,
  billing_company_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(g.subscription_tier, c.subscription_tier) as tier,
    COALESCE(g.subscription_status, c.subscription_status) as status,
    (c.group_id IS NOT NULL) as is_group_subscription,
    c.group_id as group_id,
    g.name as group_name,
    bc.name as billing_company_name
  FROM companies c
  LEFT JOIN groups g ON g.id = c.group_id
  LEFT JOIN companies bc ON bc.id = g.billing_company_id
  WHERE c.id = _company_id;
END;
$function$;

-- Add comment explaining the subscription logic
COMMENT ON COLUMN groups.billing_company_id IS 'The company in this group that receives invoices for the group subscription';
COMMENT ON COLUMN groups.subscription_tier IS 'Subscription tier applies to ALL companies in this group';
