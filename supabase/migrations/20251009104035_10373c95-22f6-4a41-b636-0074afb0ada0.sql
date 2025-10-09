-- AUDIT SECURITY FIX - CRITICAL VULNERABILITIES
-- Fix 1: Block anonymous access to profiles table (prevents email enumeration)
-- Fix 2: Restrict knowledge_base to authenticated users only
-- Fix 3: Tighten analysis_shares policies to prevent email exposure

-- ============================================
-- FIX 1: PROFILES - Block Anonymous Access
-- ============================================

-- Drop the existing policy if it doesn't include anon blocking
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Create explicit policy to block all anonymous access
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Ensure authenticated users can still read their own profile
-- (this policy should already exist, but we make sure it's correct)
DROP POLICY IF EXISTS "Users can read own profile only" ON public.profiles;

CREATE POLICY "Users can read own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- FIX 2: KNOWLEDGE_BASE - Require Authentication
-- ============================================

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read knowledge base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Anyone can read knowledge base" ON public.knowledge_base;

-- Create new policy requiring authentication
CREATE POLICY "Only authenticated users can read knowledge base"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true);

-- Block anonymous access explicitly
CREATE POLICY "Block anonymous access to knowledge base"
ON public.knowledge_base
FOR ALL
TO anon
USING (false);

-- ============================================
-- FIX 3: ANALYSIS_SHARES - Prevent Email Enumeration
-- ============================================

-- Drop the existing policy that might expose emails
DROP POLICY IF EXISTS "Users can view shares for their analyses" ON public.analysis_shares;

-- Create more restrictive policy that doesn't allow email enumeration
-- Users can only see shares where they are explicitly owner or recipient (by user_id)
CREATE POLICY "Users can view shares for their analyses"
ON public.analysis_shares
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id 
  OR auth.uid() = shared_with_user_id
  OR (
    -- Only allow email matching if there's already a user_id match
    -- This prevents fishing for emails
    shared_with_user_id IS NOT NULL 
    AND (
      SELECT profiles.email
      FROM profiles
      WHERE profiles.id = auth.uid()
    ) = shared_with_email
  )
);

-- ============================================
-- BONUS: Add audit logging for sensitive queries
-- ============================================

-- Create function to log suspicious activity (optional, for monitoring)
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_details JSONB DEFAULT '{}'::JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.companies_audit_log (accessed_by, action, company_id, accessed_at)
  VALUES (
    auth.uid(),
    'SECURITY_EVENT: ' || event_type,
    NULL,
    now()
  );
END;
$$;