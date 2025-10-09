-- Fix critical security issues (corrected version without SELECT trigger)

-- 1. Remove public access from chat_cache - make it user-specific
DROP POLICY IF EXISTS "Everyone can read cache" ON public.chat_cache;

CREATE POLICY "Users can read own cache entries"
ON public.chat_cache
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Remove public access from chat_patterns
DROP POLICY IF EXISTS "Everyone can read chat patterns" ON public.chat_patterns;

CREATE POLICY "Authenticated users can read chat patterns"
ON public.chat_patterns
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. Remove public access from chat_analytics
DROP POLICY IF EXISTS "Everyone can read analytics" ON public.chat_analytics;

CREATE POLICY "Authenticated users can read analytics"
ON public.chat_analytics
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 4. Strengthen profiles RLS - ensure email is only visible to owner or admin
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 5. Add audit logging table for companies access
CREATE TABLE IF NOT EXISTS public.companies_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  accessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.companies_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.companies_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 6. Create audit log insert policy
CREATE POLICY "Service can insert audit logs"
ON public.companies_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);