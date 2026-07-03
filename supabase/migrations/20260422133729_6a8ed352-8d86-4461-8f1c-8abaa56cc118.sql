DO $$
DECLARE
  v_user_id uuid;
  v_now text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'wilmabh03@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User wilmabh03@gmail.com not found';
    RETURN;
  END IF;

  UPDATE public.companies c
  SET
    metadata = COALESCE(c.metadata, '{}'::jsonb) || jsonb_build_object(
      'is_test_account', true,
      'onboarding_completed_at', v_now,
      'onboarding_bank_skipped', true,
      'agreement_signed_at', v_now,
      'kyc_bypassed_reason', 'test_account'
    ),
    kyc_status = CASE
      WHEN c.kyc_status IS NULL OR c.kyc_status = 'not_started' THEN 'approved'
      ELSE c.kyc_status
    END
  WHERE c.id IN (
    SELECT DISTINCT ur.company_id
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id AND ur.company_id IS NOT NULL
  );
END $$;