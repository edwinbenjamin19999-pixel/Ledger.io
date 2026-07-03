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
      RETURN v_tier IN ('starter', 'pro', 'enterprise');
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