
-- 1. Deactivate all test credential rows
UPDATE public.skatteverket_credentials
SET is_active = false
WHERE environment = 'test';

-- 2. Replace the auto-assignment trigger with a no-op
-- This prevents new companies from getting auto-created test credentials
CREATE OR REPLACE FUNCTION public.assign_skatteverket_credentials_to_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op: Skatteverket credentials are now managed via platform-level production secrets.
  -- Company-specific credentials can be added manually if needed.
  RETURN NEW;
END;
$$;

-- 3. Add validation trigger to block non-production credentials
CREATE OR REPLACE FUNCTION public.enforce_skatteverket_production_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.environment != 'production' THEN
    RAISE EXCEPTION 'Skatteverket-integrationen är låst till produktionsmiljö. Testmiljö är inte tillåten.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_skv_production_only
BEFORE INSERT OR UPDATE ON public.skatteverket_credentials
FOR EACH ROW
EXECUTE FUNCTION public.enforce_skatteverket_production_only();
