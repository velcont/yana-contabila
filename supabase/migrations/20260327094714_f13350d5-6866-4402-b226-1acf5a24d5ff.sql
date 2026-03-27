
-- Fix 1: Restrict deleted_users policy - accountants can only see users from companies they managed
DROP POLICY IF EXISTS "Accountants can view deleted users" ON public.deleted_users;

CREATE POLICY "Accountants can view deleted users they managed"
ON public.deleted_users
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.subscription_type = 'accounting_firm'::subscription_type
    )
    AND (
      deleted_users.id IN (
        SELECT c.managed_by_accountant_id FROM companies c WHERE c.managed_by_accountant_id IS NOT NULL
      )
      OR deleted_users.email IN (
        SELECT ai.client_email FROM accountant_invitations ai WHERE ai.accountant_id = auth.uid()
      )
    )
  )
);

-- Fix 2: Remove permissive public policy on yana_relationships, replace with service_role only
DROP POLICY IF EXISTS "Service can manage relationships" ON public.yana_relationships;

CREATE POLICY "Service role can manage relationships"
ON public.yana_relationships
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 3: Enable RLS on demo_rate_limits
ALTER TABLE public.demo_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (used by edge functions)
CREATE POLICY "Service role can manage demo rate limits"
ON public.demo_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anon to insert (for IP-based rate limiting from edge functions via service_role only)
-- No public read access needed
