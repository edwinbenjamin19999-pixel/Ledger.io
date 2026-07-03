DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    '[email protected]',
    crypt('TestUser2026!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'first_name', 'Test',
      'last_name', 'User',
      'company_name', 'Test Bolag (re-eqt)',
      'org_number', 'TEST-' || substring(new_user_id::text, 1, 12)
    ),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', '[email protected]', 'email_verified', true),
    'email', new_user_id::text, now(), now(), now()
  );
END $$;