UPDATE auth.users
SET 
  encrypted_password = crypt('Sommar@123!', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'info@tradgardsganget.se';

-- Säkerställ att det finns en email-identitet med email_verified=true
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', u.id::text, now(), now(), now()
FROM auth.users u
WHERE u.email = 'info@tradgardsganget.se'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );