-- Fix profiles table RLS policies to prevent unauthorized access
-- The handle_new_user() trigger handles INSERT via SECURITY DEFINER
-- We need to restrict manual inserts and add DELETE policy

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create complete RLS policies for profiles table

-- SELECT: Users can ONLY view their own profile (no public access)
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Only service role can insert (via trigger)
-- This prevents users from creating fake profiles
CREATE POLICY "Only service role can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Allow service role to insert (the trigger uses SECURITY DEFINER)
CREATE POLICY "Service role can insert profiles"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- DELETE: Prevent direct deletion (cascade from auth.users handles this)
CREATE POLICY "Profiles cannot be directly deleted"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);