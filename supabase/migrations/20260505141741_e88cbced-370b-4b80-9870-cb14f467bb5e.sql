UPDATE public.companies
SET kyc_status = 'approved',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'is_test_account', true,
      'agreement_signed_at', now(),
      'onboarding_bank_skipped', true,
      'onboarding_completed_at', now()
    )
WHERE id = 'cade4c59-b9b8-452b-b9d8-ff32f7693e53';