-- Remove the faulty 'Block anonymous access to profiles' policy that blocks ALL access
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Create a proper policy to block anonymous access while allowing authenticated users
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Ensure authenticated users can still access their own profiles
-- The existing policies already handle this, but let's make sure they work correctly
-- by confirming they check for authenticated users properly