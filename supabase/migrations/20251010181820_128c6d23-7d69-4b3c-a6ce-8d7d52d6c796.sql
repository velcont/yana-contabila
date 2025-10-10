-- Fix security issues in profiles table
-- Drop the ineffective "Block anonymous access" policy
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Ensure only authenticated users can read their own profile
-- This policy already exists but let's make sure it's the only one allowing SELECT for regular users
DROP POLICY IF EXISTS "Users can read own profile only" ON public.profiles;

CREATE POLICY "Users can read own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Keep admin policy for viewing all profiles
-- This already exists and is correct

-- Ensure users can only update their own profile
-- This policy already exists and is correct

-- Prevent any anonymous access by not having any policies for anon role
-- All existing policies use TO authenticated or check auth.uid()

-- Additional security: Ensure profiles table requires authentication for all operations
-- by not having any policies that allow anon role access