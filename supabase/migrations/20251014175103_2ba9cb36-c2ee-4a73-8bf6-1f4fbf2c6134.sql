-- Fix RLS policy for accountants updating fiscal parameters
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Accountants can update managed companies fiscal params" ON companies;

-- Create a new, properly permissive policy for fiscal parameter updates
CREATE POLICY "Accountants can update managed companies fiscal params"
ON companies
FOR UPDATE
TO authenticated
USING (
  -- Accountant can update if they manage the company
  auth.uid() = managed_by_accountant_id
)
WITH CHECK (
  -- After update, accountant must still be the manager
  -- This allows updating fiscal fields without changing managed_by_accountant_id
  auth.uid() = managed_by_accountant_id
  OR 
  -- OR the company owner can update
  auth.uid() = user_id
);