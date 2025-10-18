-- Allow accountants (subscription_type = 'accounting_firm') to view deleted users
-- Keeps admin access intact via existing policy

-- Safety: drop if exists to avoid duplicates when re-running
DROP POLICY IF EXISTS "Accountants can view deleted users" ON public.deleted_users;

CREATE POLICY "Accountants can view deleted users"
ON public.deleted_users
FOR SELECT
TO authenticated
USING (
  -- Any user whose profile is an accounting firm can view all deleted users
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.subscription_type = 'accounting_firm'::public.subscription_type
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
