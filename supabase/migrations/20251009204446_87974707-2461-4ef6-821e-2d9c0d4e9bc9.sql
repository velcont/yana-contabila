-- Verify and strengthen RLS policies for companies table

-- Drop existing policies to recreate them with explicit checks
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;

-- Recreate policies with stronger checks and explicit authentication verification

-- SELECT policies (most critical - prevent data leakage)
CREATE POLICY "Users can view only their own companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT policy (ensure user_id is set correctly)
CREATE POLICY "Users can create their own companies only"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- UPDATE policy (prevent privilege escalation)
CREATE POLICY "Users can update only their own companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id AND
  user_id = (SELECT user_id FROM public.companies WHERE id = companies.id)
);

-- DELETE policy
CREATE POLICY "Users can delete only their own companies"
ON public.companies
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Add index for better RLS performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);

-- Add helpful comments
COMMENT ON POLICY "Users can view only their own companies" ON public.companies IS 
'Restricts SELECT to authenticated users viewing only their own company records. Prevents data leakage.';

COMMENT ON POLICY "Admins can view all companies" ON public.companies IS 
'Allows administrators to view all companies for management purposes. Uses has_role function to prevent recursive RLS issues.';

COMMENT ON POLICY "Users can update only their own companies" ON public.companies IS 
'Prevents users from modifying other users companies and prevents privilege escalation by checking both USING and WITH CHECK conditions.';