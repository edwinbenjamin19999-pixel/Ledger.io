-- Fix 1: Set search_path on mask_iban function
CREATE OR REPLACE FUNCTION public.mask_iban(iban text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = 'public'
AS $function$
  SELECT CASE 
    WHEN iban IS NULL OR length(iban) < 4 THEN '****'
    ELSE repeat('*', length(iban) - 4) || right(iban, 4)
  END;
$function$;

-- Fix 2: Replace overly permissive INSERT policy on admin_notifications
-- Only service role inserts (from triggers/edge functions), so restrict to authenticated + system context
DROP POLICY IF EXISTS "System can insert admin notifications" ON public.admin_notifications;
CREATE POLICY "System can insert admin notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix 3: Replace overly permissive INSERT policy on profiles  
-- Only allow users to insert their own profile
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);