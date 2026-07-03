-- Add domain verification columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS domain_verification_token text,
  ADD COLUMN IF NOT EXISTS domain_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS domain_verified_at timestamptz;

-- Constraint on allowed status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_domain_status_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_domain_status_check
      CHECK (domain_status IN ('unverified','pending','verified','failed'));
  END IF;
END$$;

-- Trigger: ensure a verification token exists whenever a domain is set/changed
CREATE OR REPLACE FUNCTION public.ensure_tenant_domain_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate token on insert if missing
  IF TG_OP = 'INSERT' AND NEW.domain_verification_token IS NULL THEN
    NEW.domain_verification_token := encode(gen_random_bytes(16), 'hex');
  END IF;

  -- On domain change, reset verification state and rotate token
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.domain,'') <> COALESCE(OLD.domain,'') THEN
    NEW.domain_verification_token := encode(gen_random_bytes(16), 'hex');
    NEW.domain_status := CASE WHEN NEW.domain IS NULL OR NEW.domain = '' THEN 'unverified' ELSE 'pending' END;
    NEW.domain_verified_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_tenant_domain_token ON public.tenants;
CREATE TRIGGER trg_ensure_tenant_domain_token
  BEFORE INSERT OR UPDATE OF domain ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.ensure_tenant_domain_token();

-- Backfill tokens for any existing rows
UPDATE public.tenants
SET domain_verification_token = encode(gen_random_bytes(16), 'hex')
WHERE domain_verification_token IS NULL;

-- Index for fast custom-domain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_domain_verified
  ON public.tenants(domain) WHERE domain_status = 'verified';